# 🚀 DEPLOYMENT GUIDE

## Pre-Deploy Checklist

### 1. Apply Supabase Migration ⚠️ CRITICAL
```bash
# Go to: https://app.supabase.com
# SQL Editor → Copy supabase-migration-business-config.sql → Run
```

### 2. Install Dependencies
```bash
cd /root/toolxprint
npm install dompurify @types/dompurify html2pdf.js qrcode.react react-hot-toast
```

### 3. Apply All Patches
```bash
# Read and apply each patch file manually
# (Files too large for auto-apply)
```

### 4. Build
```bash
npm run build
```

### 5. Test Build
```bash
npm run preview
# Or serve build folder
```

---

## Deploy to Production

### Option A: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd /root/toolxprint
vercel --prod

# Set environment variables in Vercel dashboard:
# REACT_APP_SUPABASE_URL
# REACT_APP_SUPABASE_ANON_KEY
```

### Option B: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=build

# Set env vars in Netlify dashboard
```

### Option C: VPS (Manual)
```bash
# Build
npm run build

# Copy build folder to server
scp -r build/* user@server:/var/www/html/

# Setup nginx
sudo nano /etc/nginx/sites-available/toolxprint
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Post-Deploy

### 1. Verify
- [ ] App loads
- [ ] Login works
- [ ] Supabase connected
- [ ] Variables replaced
- [ ] PDF export works
- [ ] QR code shows

### 2. Monitor
- Check browser console for errors
- Check Supabase logs
- Test all features

### 3. Backup
- Export Supabase data
- Backup .env file
- Document any custom changes

---

## Quick Deploy (if already setup)
```bash
npm run build && vercel --prod
```

Done! 🎉
