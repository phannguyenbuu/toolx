#!/bin/bash
export VIRTUAL_ENV=/root/toolxprint/python-services/venv
export PATH="$VIRTUAL_ENV/bin:$PATH"
cd /root/toolxprint/python-services
exec /root/toolxprint/python-services/venv/bin/python3 server.py
