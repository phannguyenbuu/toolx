# 🎉 SUPABASE LOCAL - CÀI ĐẶT HOÀN TẤT!

## ✅ ĐÃ HOÀN THÀNH

### Supabase đã được cài đặt LOCAL trên VPS này!

**Location:** `/root/supabase-local/supabase/docker`

**Services đang chạy:**
- ✅ PostgreSQL (port 5433)
- ✅ PostgREST API (port 8000)
- ✅ GoTrue Auth
- ✅ Realtime
- ✅ Storage
- ✅ Studio Dashboard
- ✅ Kong Gateway

**Database:**
- ✅ 10 tables đã được tạo
- ✅ Row Level Security enabled
- ✅ Triggers & Functions active

## 🔗 ACCESS

### API Endpoint
```
http://157.66.80.125:8000
```

### API Keys
```
ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE

SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q
```

### Studio Dashboard
```
http://157.66.80.125:8000
Username: supabase
Password: this_password_is_insecure_and_should_be_updated
```

## 🎯 TEST

### Test API
```bash
curl http://157.66.80.125:8000/rest/v1/profiles \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"
```

### Test trong App
Truy cập: http://157.66.80.125
Navigate to: `supabase-demo`

## 📊 TABLES

- profiles
- projects
- files
- customers
- quotes
- invoices
- products
- paper_prices
- templates
- activity_logs

## 🔧 MANAGEMENT

### Start/Stop Supabase
```bash
cd /root/supabase-local/supabase/docker

# Stop
/usr/local/bin/docker-compose-v2 down

# Start
/usr/local/bin/docker-compose-v2 up -d

# View logs
/usr/local/bin/docker-compose-v2 logs -f

# Check status
docker ps | grep supabase
```

### Access Database
```bash
docker exec -it supabase-db psql -U postgres -d postgres
```

### Backup Database
```bash
docker exec supabase-db pg_dump -U postgres postgres > backup.sql
```

### Restore Database
```bash
docker exec -i supabase-db psql -U postgres -d postgres < backup.sql
```

## 📝 USAGE

App đã được cấu hình để dùng Supabase local:
- URL: http://157.66.80.125:8000
- Keys: Demo keys (đã update trong .env)

Tất cả hooks và APIs đã sẵn sàng:
```typescript
import { useProjects } from './hooks/useSupabase';

const { projects, createProject } = useProjects();
```

## 🎉 READY!

Supabase local đang chạy và sẵn sàng sử dụng!

**Test ngay:**
1. Truy cập http://157.66.80.125
2. Navigate to `supabase-demo`
3. Đăng ký tài khoản mới
4. Bắt đầu sử dụng!
