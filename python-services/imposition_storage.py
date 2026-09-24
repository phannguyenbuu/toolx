"""
Imposition Storage & Google Auth Module
Lưu trữ danh sách tệp in bền vững (Persistent) trên máy chủ bằng SQLite
Hỗ trợ xác thực Google Account & cấp phát JWT 30 ngày (30 days token)
"""

import os
import json
import time
import hmac
import hashlib
import base64
import sqlite3
from datetime import datetime, timezone
from flask import request, jsonify

JWT_SECRET = os.getenv("JWT_SECRET", "toolx-jwt-secret-key-30days-printagent")
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "source_files", "imposition_db.sqlite")

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            full_name TEXT,
            picture TEXT,
            provider TEXT DEFAULT 'google',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS imposition_files (
            file_id TEXT PRIMARY KEY,
            user_id TEXT DEFAULT 'anonymous',
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            layer_count INTEGER DEFAULT 1,
            dimensions_text TEXT,
            thumb_url TEXT,
            layers_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_imposition_files_user ON imposition_files (user_id)")
    conn.commit()
    conn.close()

# Khởi tạo bảng khi import
init_db()

def create_jwt_token(payload: dict, days: int = 30) -> str:
    """Tạo JWT token chuẩn HS256 có hiệu lực 30 ngày"""
    now = int(time.time())
    full_payload = {
        **payload,
        "iat": now,
        "exp": now + (days * 24 * 3600),
    }
    header_json = json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(',', ':'))
    body_json = json.dumps(full_payload, separators=(',', ':'))

    header_b64 = base64.urlsafe_b64encode(header_json.encode()).decode().rstrip("=")
    body_b64 = base64.urlsafe_b64encode(body_json.encode()).decode().rstrip("=")

    signature = hmac.new(
        JWT_SECRET.encode(),
        f"{header_b64}.{body_b64}".encode(),
        hashlib.sha256
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")

    return f"{header_b64}.{body_b64}.{sig_b64}"

def verify_jwt_token(token: str) -> dict | None:
    """Xác thực JWT token và kiểm tra thời hạn (30 ngày)"""
    if not token:
        return None
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, body_b64, sig_b64 = parts

        expected_sig = hmac.new(
            JWT_SECRET.encode(),
            f"{header_b64}.{body_b64}".encode(),
            hashlib.sha256
        ).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")

        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None

        body_padded = body_b64 + "=" * (-len(body_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(body_padded).decode())

        if payload.get("exp", 0) < time.time():
            return None  # Đã hết hạn

        return payload
    except Exception:
        return None

def extract_user_from_request() -> dict | None:
    """Lấy thông tin người dùng từ Header Authorization Bearer"""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        return verify_jwt_token(token)
    return None

def register_storage_routes(app):
    """Đăng ký các route xác thực Google và lưu trữ tệp bền vững cho Flask app"""

    # 1. Google Auth & 30-day JWT
    @app.route("/api/auth/google", methods=["POST"])
    def api_auth_google():
        try:
            data = request.get_json(force=True, silent=True) or {}
            credential = data.get("credential")

            # Hỗ trợ giải mã Google ID Token nếu được gửi từ Google One Tap / GIS
            email = data.get("email")
            full_name = data.get("name") or data.get("fullName") or ""
            picture = data.get("picture") or data.get("avatarUrl") or ""
            google_sub = data.get("sub") or data.get("googleId")

            if credential and not email:
                try:
                    # Parse Google ID Token không cần thư viện ngoài (Google JWT payload)
                    token_parts = credential.split(".")
                    if len(token_parts) >= 2:
                        payload_b64 = token_parts[1] + "=" * (-len(token_parts[1]) % 4)
                        g_payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
                        email = g_payload.get("email")
                        full_name = g_payload.get("name") or full_name
                        picture = g_payload.get("picture") or picture
                        google_sub = g_payload.get("sub") or google_sub
                except Exception as parse_err:
                    print(f"[AUTH] Lỗi giải mã Google Credential: {parse_err}")

            if not email:
                return jsonify({"error": "Thiếu thông tin email từ Google"}), 400

            user_id = f"usr_{hashlib.md5(email.lower().encode()).hexdigest()[:16]}"

            # Lưu / cập nhật user trong DB
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (id, email, full_name, picture, provider, last_login)
                VALUES (?, ?, ?, ?, 'google', CURRENT_TIMESTAMP)
                ON CONFLICT(email) DO UPDATE SET
                    full_name = excluded.full_name,
                    picture = excluded.picture,
                    last_login = CURRENT_TIMESTAMP
            """, (user_id, email.lower(), full_name, picture))
            conn.commit()
            conn.close()

            # Tạo JWT token 30 ngày (30 * 24 * 3600 giây)
            jwt_token = create_jwt_token({
                "sub": user_id,
                "email": email.lower(),
                "fullName": full_name,
                "avatarUrl": picture,
                "provider": "google",
            }, days=30)

            user_obj = {
                "id": user_id,
                "email": email.lower(),
                "fullName": full_name,
                "avatarUrl": picture,
                "provider": "google",
            }

            return jsonify({
                "success": True,
                "access_token": jwt_token,
                "token": jwt_token,
                "user": user_obj,
                "expires_in": 30 * 24 * 3600,
                "message": "Đăng nhập Google thành công, phiên đăng nhập 30 ngày."
            })
        except Exception as e:
            print(f"[ERROR] /api/auth/google: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/auth/me", methods=["GET"])
    def api_auth_me():
        user = extract_user_from_request()
        if not user:
            return jsonify({"error": "Chưa đăng nhập hoặc token đã hết hạn"}), 401
        return jsonify({"success": True, "user": user})

    # 2. Danh mục tệp in bền vững (Persistent Imposition Files)
    @app.route("/api/imposition/files", methods=["GET"])
    def api_get_imposition_files():
        try:
            user = extract_user_from_request()
            user_id = user.get("sub") if user else "anonymous"

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT file_id, file_name, file_type, layer_count, dimensions_text, thumb_url, layers_json, created_at, updated_at
                FROM imposition_files
                WHERE user_id = ? OR user_id = 'anonymous'
                ORDER BY updated_at DESC
            """, (user_id,))
            rows = cursor.fetchall()
            conn.close()

            files = []
            for r in rows:
                tabs = []
                if r["layers_json"]:
                    try:
                        tabs = json.loads(r["layers_json"])
                    except Exception:
                        pass
                files.append({
                    "fileId": r["file_id"],
                    "fileName": r["file_name"],
                    "fileType": r["file_type"],
                    "layerCount": r["layer_count"],
                    "dimensionsText": r["dimensions_text"],
                    "thumbUrl": r["thumb_url"],
                    "tabs": tabs,
                    "createdAt": r["created_at"],
                    "updated_at": r["updated_at"],
                })

            return jsonify({"success": True, "files": files})
        except Exception as e:
            print(f"[ERROR] /api/imposition/files: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/imposition/files", methods=["POST"])
    def api_save_imposition_file():
        try:
            user = extract_user_from_request()
            user_id = user.get("sub") if user else "anonymous"

            body = request.get_json(force=True, silent=True) or {}
            file_id = body.get("fileId")
            file_name = body.get("fileName")
            file_type = body.get("fileType", "image")
            layer_count = body.get("layerCount", 1)
            dimensions_text = body.get("dimensionsText", "")
            thumb_url = body.get("thumbUrl", "")
            tabs = body.get("tabs", [])

            if not file_id or not file_name:
                return jsonify({"error": "Thiếu fileId hoặc fileName"}), 400

            layers_json = json.dumps(tabs)

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO imposition_files (file_id, user_id, file_name, file_type, layer_count, dimensions_text, thumb_url, layers_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(file_id) DO UPDATE SET
                    user_id = excluded.user_id,
                    file_name = excluded.file_name,
                    file_type = excluded.file_type,
                    layer_count = excluded.layer_count,
                    dimensions_text = excluded.dimensions_text,
                    thumb_url = excluded.thumb_url,
                    layers_json = excluded.layers_json,
                    updated_at = CURRENT_TIMESTAMP
            """, (file_id, user_id, file_name, file_type, layer_count, dimensions_text, thumb_url, layers_json))
            conn.commit()
            conn.close()

            return jsonify({"success": True, "fileId": file_id, "message": "Đã lưu tệp bền vững trên server"})
        except Exception as e:
            print(f"[ERROR] /api/imposition/files POST: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/imposition/files/<file_id>", methods=["DELETE"])
    def api_delete_imposition_file(file_id):
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM imposition_files WHERE file_id = ?", (file_id,))
            conn.commit()
            conn.close()
            return jsonify({"success": True, "message": f"Đã xóa tệp {file_id}"})
        except Exception as e:
            print(f"[ERROR] /api/imposition/files DELETE: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/imposition/files/sync", methods=["POST"])
    def api_sync_imposition_files():
        """Đồng bộ toàn bộ danh sách tệp in của người dùng lên server một lần"""
        try:
            user = extract_user_from_request()
            user_id = user.get("sub") if user else "anonymous"

            body = request.get_json(force=True, silent=True) or {}
            files = body.get("files", [])

            conn = get_db()
            cursor = conn.cursor()
            for f in files:
                f_id = f.get("fileId")
                f_name = f.get("fileName")
                if not f_id or not f_name:
                    continue
                layers_json = json.dumps(f.get("tabs", []))
                cursor.execute("""
                    INSERT INTO imposition_files (file_id, user_id, file_name, file_type, layer_count, dimensions_text, thumb_url, layers_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(file_id) DO UPDATE SET
                        user_id = excluded.user_id,
                        file_name = excluded.file_name,
                        file_type = excluded.file_type,
                        layer_count = excluded.layer_count,
                        dimensions_text = excluded.dimensions_text,
                        thumb_url = excluded.thumb_url,
                        layers_json = excluded.layers_json,
                        updated_at = CURRENT_TIMESTAMP
                """, (f_id, user_id, f_name, f.get("fileType", "image"), f.get("layerCount", 1), f.get("dimensionsText", ""), f.get("thumbUrl", ""), layers_json))
            conn.commit()
            conn.close()

            return jsonify({"success": True, "count": len(files), "message": f"Đã đồng bộ {len(files)} tệp lên server"})
        except Exception as e:
            print(f"[ERROR] /api/imposition/files/sync: {e}")
            return jsonify({"error": str(e)}), 500
