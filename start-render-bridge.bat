@echo off
chcp 65001 > nul
title PrintAgent Render Bridge (Port 8080)
echo ========================================================
echo  🚀 Đang khởi động PrintAgent Render Bridge...
echo  Cổng lắng nghe: http://127.0.0.1:8080
echo  Thư mục theo dõi: D:\render
echo  Thời gian chờ: 60 phút
echo ========================================================
python "%~dp0scripts\printagent_render_bridge.py"
pause
