#!/bin/bash

# WiseChoice AI Service launch script

echo "============================================================"
echo "🚀 WiseChoice AI Service Starting"
echo "============================================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python."
    exit 1
fi

# Check API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY environment variable is not set."
    echo ""
    echo "Set your API key with:"
    echo "export OPENAI_API_KEY=\"your-api-key-here\""
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Environment check complete"
echo ""
echo "📍 Service will run at http://localhost:8765"
echo "🔗 Make sure the Chrome extension is loaded"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""
echo "============================================================"
echo ""

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "🔧 Activating virtual environment..."
    source venv/bin/activate
fi

# Start service
export OPENAI_API_KEY="${OPENAI_API_KEY}"
python api_server.py
