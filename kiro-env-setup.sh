#!/bin/bash

# Kiro CLI Environment Setup
# This script sets up the environment for Kiro CLI to work with Python

echo "🔧 Setting up Kiro CLI environment..."

# Add Python paths to bashrc if not already present
if ! grep -q "KIRO_PYTHON_PATH" ~/.bashrc; then
    echo "" >> ~/.bashrc
    echo "# Kiro CLI Python Environment" >> ~/.bashrc
    echo "export KIRO_PYTHON_PATH=/root/toolxprint/python-services" >> ~/.bashrc
    echo "export PATH=/root/.local/bin:\$PATH" >> ~/.bashrc
    echo "alias kiro-python='cd /root/toolxprint/python-services && source venv/bin/activate && python'" >> ~/.bashrc
    echo "alias kiro-start-python='/root/toolxprint/kiro-start-python.sh'" >> ~/.bashrc
    echo "✅ Added Kiro CLI environment variables to ~/.bashrc"
else
    echo "✅ Kiro CLI environment already configured"
fi

# Source the bashrc
source ~/.bashrc

echo "🎯 Kiro CLI environment setup complete!"
echo ""
echo "Available commands:"
echo "  kiro-python          - Run Python with virtual environment"
echo "  kiro-start-python     - Start Python AI service in background"
echo "  kiro-cli chat         - Start Kiro CLI chat"