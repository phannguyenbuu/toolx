#!/bin/bash

# Auto-restart script for ToolXPrint services
LOG_FILE="/var/log/toolxprint-monitor.log"

echo "$(date): Checking ToolXPrint services..." >> $LOG_FILE

# Run health check
if ! /root/toolxprint/health-check.sh > /dev/null 2>&1; then
    echo "$(date): Services are down, restarting..." >> $LOG_FILE
    systemctl restart toolxprint
    sleep 30
    
    # Check again
    if /root/toolxprint/health-check.sh > /dev/null 2>&1; then
        echo "$(date): Services restarted successfully" >> $LOG_FILE
    else
        echo "$(date): Failed to restart services" >> $LOG_FILE
    fi
else
    echo "$(date): All services are healthy" >> $LOG_FILE
fi
