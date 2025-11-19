#!/bin/bash

# Test script to verify prompt configuration is working

echo "========================================="
echo "  Prompt Configuration Test Script"
echo "========================================="
echo ""

# 1. Check .env file
echo "1. Checking .env file:"
echo "-------------------------------------------"
if grep -q "VITE_CLINE_PROMPT_CONFIG" .env; then
    grep "VITE_CLINE_PROMPT_CONFIG" .env
else
    echo "❌ VITE_CLINE_PROMPT_CONFIG not found in .env"
    exit 1
fi
echo ""

# 2. Check prompt-configurations.json
echo "2. Checking prompt-configurations.json:"
echo "-------------------------------------------"
if [ -f webview-ui/public/prompt-configurations.json ]; then
    echo "✅ File exists"
    # Check if design_assistant has SIMPLE override type
    if grep -q '"overrideType": "PROMPT_OVERRIDE_TYPE_SIMPLE"' webview-ui/public/prompt-configurations.json; then
        echo "✅ design_assistant has SIMPLE override type"
    else
        echo "❌ design_assistant does NOT have SIMPLE override type"
        echo "Current overrideType:"
        grep -A 1 "design_assistant" webview-ui/public/prompt-configurations.json | grep "overrideType"
    fi
else
    echo "❌ prompt-configurations.json not found"
    exit 1
fi
echo ""

# 3. Check globalState.json
echo "3. Checking globalState.json:"
echo "-------------------------------------------"
if [ -f ~/.cline/data/globalState.json ]; then
    echo "✅ File exists ($(du -h ~/.cline/data/globalState.json | cut -f1))"
    # Try to find currentPromptConfigKey
    if command -v jq &> /dev/null; then
        echo "Current prompt config in state:"
        jq -r '.currentPromptConfigKey // "NOT SET"' ~/.cline/data/globalState.json
    else
        echo "⚠️  jq not installed, showing raw grep:"
        grep -o '"currentPromptConfigKey":"[^"]*"' ~/.cline/data/globalState.json || echo "currentPromptConfigKey: NOT SET"
    fi
else
    echo "⚠️  globalState.json does not exist (will be created on first run)"
fi
echo ""

# 4. Instructions for browser localStorage
echo "4. Browser localStorage Check:"
echo "-------------------------------------------"
echo "You MUST check this manually in the browser:"
echo ""
echo "1. Open http://localhost:25463 in your browser"
echo "2. Open DevTools (F12)"
echo "3. Go to Console tab"
echo "4. Run this command:"
echo ""
echo "   localStorage.getItem('cline_prompt_config')"
echo ""
echo "Expected result: null (or 'design_assistant')"
echo "If it shows anything else, run:"
echo ""
echo "   localStorage.clear(); location.reload()"
echo ""

# 5. Check if services are running
echo "5. Service Status:"
echo "-------------------------------------------"
if pgrep -f "cline-host" > /dev/null; then
    echo "✅ Hostbridge is running (PID: $(pgrep -f "cline-host"))"
else
    echo "❌ Hostbridge is NOT running"
fi

if pgrep -f "cline-core.js" > /dev/null; then
    echo "✅ Cline Core is running (PID: $(pgrep -f "cline-core.js"))"
else
    echo "❌ Cline Core is NOT running"
fi

if pgrep -f "vite" > /dev/null; then
    echo "✅ Frontend is running (PID: $(pgrep -f "vite"))"
else
    echo "❌ Frontend is NOT running"
fi
echo ""

# 6. Check logs for configuration loading
echo "6. Checking Logs:"
echo "-------------------------------------------"
echo "Backend (Task.ts) logs:"
if grep -q "\[Task\].*prompt configuration" /tmp/cline-core.log 2>/dev/null; then
    echo "Recent prompt config logs:"
    grep "\[Task\].*prompt configuration" /tmp/cline-core.log | tail -5
else
    echo "⚠️  No prompt configuration logs found in /tmp/cline-core.log"
    echo "This means no new tasks have been started since restart"
fi
echo ""

echo "Frontend logs:"
if grep -q "prompt config" /tmp/cline-frontend.log 2>/dev/null; then
    echo "Recent prompt config logs:"
    grep -i "prompt config\|design_assistant" /tmp/cline-frontend.log | tail -5
else
    echo "⚠️  No prompt configuration logs found in /tmp/cline-frontend.log"
fi
echo ""

# 7. Next steps
echo "========================================="
echo "  Next Steps:"
echo "========================================="
echo ""
echo "CRITICAL: Clear browser localStorage!"
echo ""
echo "1. Open http://localhost:25463"
echo "2. Open DevTools (F12) → Console"
echo "3. Run: localStorage.clear(); location.reload()"
echo "4. Check console for: 'Using prompt config from environment variable: design_assistant'"
echo "5. Start a NEW chat (don't continue old one)"
echo "6. Ask: 'What is your name?'"
echo "7. Expected: 'My name is Srishti'"
echo ""
echo "If still not working, check /tmp/cline-core.log for errors"
echo ""
