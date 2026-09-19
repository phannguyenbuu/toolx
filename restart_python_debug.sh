#!/bin/bash
# Restart Python service with debug logging

echo "Stopping Python service..."
pkill -f "python.*server.py"
sleep 2

echo "Starting Python service with debug..."
cd /root/toolxprint/python-services
nohup python server.py > ../python-service.log 2>&1 &

echo "Python service started (PID: $!)"
echo "Tailing log..."
tail -f ../python-service.log
