# Prompt Override Fix - Design Assistant Configuration

## Problem Identified

The `design_assistant` configuration was not overriding Cline's default prompts because it had:
```json
"overrideType": "PROMPT_OVERRIDE_TYPE_UNSPECIFIED"
```

This value means "don't override anything - use default Cline behavior".

## Solution Applied

Changed the configuration to:
```json
"overrideType": "PROMPT_OVERRIDE_TYPE_SIMPLE",
"simplePromptText": "You are Srishti, a highly skilled software designer and developer..."
```

Now the configuration will **completely replace** Cline's system prompt with your custom prompt where Cline identifies as "Srishti".

## What You Need to Do Next

### 1. Clear Browser Cache/LocalStorage
The frontend caches the configuration in localStorage. You need to either:

**Option A: Clear localStorage in browser**
- Open browser DevTools (F12)
- Go to Application/Storage tab
- Find localStorage
- Delete the `cline_prompt_config` key or clear all localStorage
- Refresh the page

**Option B: Clear browser cache completely**
- In your browser settings, clear all browsing data including cached files

### 2. Restart Cline Standalone
```bash
# Kill existing processes
pkill -f 'cline-host|cline-core.js|vite'

# Restart
cd cline-hacking && ./start-standalone.sh
```

### 3. Verify the Configuration is Loaded
After restart, check the browser console logs. You should see:
```
Using prompt config from environment variable: design_assistant
Initialized localStorage with config from env: design_assistant
```

### 4. Test
Ask Cline "What is your name?" and it should respond with "Srishti" instead of "Cline" or "Claude".

## Understanding Override Types

- **PROMPT_OVERRIDE_TYPE_UNSPECIFIED**: No override - uses default Cline prompts ❌
- **PROMPT_OVERRIDE_TYPE_SIMPLE**: Completely replaces system prompt ✅
- **PROMPT_OVERRIDE_TYPE_COMPLEX**: Overrides specific components (role, rules, tools, etc.) ✅

## Current .env Configuration

Your `.env` file should have:
```
VITE_CLINE_PROMPT_CONFIG=design_assistant
```

This tells both the frontend and backend to use the `design_assistant` configuration.

## Troubleshooting

If Cline still doesn't identify as "Srishti":

1. **Check the logs** - Look for messages like:
   - `[Task] Using prompt config from environment variable: design_assistant`
   - `[Task] Loaded prompt configuration: design_assistant`

2. **Verify the JSON is loaded** - Check browser console for any JSON parse errors

3. **Check StateManager** - The backend reads from StateManager's globalState, which might be empty on first run. The fallback to `process.env.VITE_CLINE_PROMPT_CONFIG` should handle this.

4. **Try a fresh start** - Delete `~/.cline` directory to clear all state, then restart

## Technical Details

The fix involved:
1. ✅ Updated `prompt-configurations.json` with proper override type and prompt text
2. ✅ Frontend loads config from env variable on startup
3. ✅ Frontend saves to localStorage for persistence
4. ✅ Backend reads from StateManager OR falls back to env variable
5. ✅ Backend passes `promptConfiguration` to `getSystemPrompt()`
6. ✅ `PromptRegistry.get()` checks for SIMPLE override and returns custom prompt

When `overrideType` is `PROMPT_OVERRIDE_TYPE_SIMPLE`, the PromptRegistry completely bypasses Cline's default prompts and uses your `simplePromptText` instead.
