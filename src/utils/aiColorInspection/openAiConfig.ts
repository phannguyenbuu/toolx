// Token ChatGPT do người dùng cung cấp
export const DEFAULT_OPENAI_KEY = process.env.REACT_APP_OPENAI_API_KEY || '';

export const getOpenAIKey = (): string => {
  return localStorage.getItem('openai_api_key') || DEFAULT_OPENAI_KEY;
};

export const setOpenAIKey = (key: string) => {
  localStorage.setItem('openai_api_key', key.trim());
};

/**
 * Thu nhỏ Canvas và chuyển thành chuỗi base64 JPEG chất lượng cao để gửi qua OpenAI Vision API
 */
export function canvasToOptimizedBase64(canvas: HTMLCanvasElement, maxDimension = 1024): string {
  const w = canvas.width;
  const h = canvas.height;
  const scale = Math.min(1, maxDimension / Math.max(w, h));

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = Math.max(1, Math.round(w * scale));
  thumbCanvas.height = Math.max(1, Math.round(h * scale));
  const tCtx = thumbCanvas.getContext('2d');
  if (tCtx) {
    tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }
  return thumbCanvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Đọc File ảnh từ máy người dùng thành chuỗi base64 nén tối ưu
 */
export async function imageFileToOptimizedBase64(file: File, maxDimension = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const scale = Math.min(1, maxDimension / Math.max(w, h));

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
