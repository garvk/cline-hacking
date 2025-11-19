# Debugging Prompt Override Issue

## Current Situation
- Configuration file updated with SIMPLE override type ✅
- .env has `VITE_CLINE_PROMPT_CONFIG=design_assistant` ✅  
- Server restarted ✅
- **BUT: Still showing "HR Legal Assistant" instead of "Srishti"** ❌

## Root Cause Analysis

The issue is likely **browser localStorage caching**. The frontend stores the selected configuration in `localStorage.getItem("cline_prompt_config")` which overrides the environment variable.

### How the Configuration Loading Works

1. **Frontend Priority Order:**
   ```javascript
   // From prompt-config-loader.ts line 91-103
   getCurrentConfigurationKey(): string {
     // Priority order: localStorage > environment variable > default
     const stored = localStorage.getItem("cline_prompt_config")
     if (stored) {
       this.currentConfigKey = stored  // ← THIS IS OVERRIDING YOUR ENV VAR
       return this.currentConfigKey
     }
     // Only checks env var if localStorage is empty
     const envConfig = import.meta.env.VITE_CLINE_PROMPT_CONFIG
     if (envConfig && typeof envConfig === "string") {
       this.currentConfigKey = envConfig
       return this.currentConfigKey
     }
     return this.currentConfigKey
   }
   ```

2. **Backend reads from StateManager**, which persists to `~/.cline/data/globalState.json`

## Solution Steps

### Step 1: Clear Browser LocalStorage
Open http://localhost:25463 in your browser, then:

1. Open DevTools (F12 or Right Click → Inspect)
2. Go to **Application** tab (or **Storage** in some browsers)
3. Expand **Local Storage** → `http://localhost:25463`
4. Find and delete the key: `cline_prompt_config`
5. Or click "Clear All" to remove all localStorage
6. **Refresh the page** (F5 or Cmd+R)

### Step 2: Verify in Browser Console
After clearing, check the console for these logs:
```
Using prompt config from environment variable: design_assistant
Initialized localStorage with config from env: design_assistant
```

### Step 3: Clear Backend State (Optional but Recommended)
The backend caches config in `~/.cline/data/globalState.json`:

```bash
# Option A: Edit the file to remove currentPromptConfigKey
# Open globalState.json and search for "currentPromptConfigKey", delete that line

# Option B: Delete the entire state (nuclear option - clears all settings)
rm ~/.cline/data/globalState.json
rm ~/.cline/data/secrets.json  # Optional: only if you want to clear API keys too
```

### Step 4: Restart and Test
```bash
# Kill and restart
pkill -f 'cline-host|cline-core.js|vite'
cd cline-hacking && ./start-standalone.sh
```

Then start a new conversation and ask: **"What is your name?"**

Expected response: **"My name is Srishti"**

## Quick Debug Script

Run this to check all relevant state:

```bash
# Check env variable
echo "ENV Variable:"
grep VITE_CLINE_PROMPT_CONFIG cline-hacking/.env

# Check if globalState has cached config
echo -e "\nglobalState.json currentPromptConfigKey:"
if [ -f ~/.cline/data/globalState.json ]; then
  grep -o '"currentPromptConfigKey":"[^"]*"' ~/.cline/data/globalState.json || echo "Not set"
else
  echo "File doesn't exist"
fi

# Check browser localStorage (requires browser DevTools)
echo -e "\nBrowser localStorage:"
echo "Open DevTools → Console and run:"
echo "  localStorage.getItem('cline_prompt_config')"
```

## Manual localStorage Clear Command

If you have browser automation, you can clear localStorage with this JavaScript:
```javascript
// Run in browser console at http://localhost:25463
localStorage.removeItem('cline_prompt_config');
// Or clear everything:
localStorage.clear();
// Then refresh:
location.reload();
```

## Verification Checklist

After following the steps above:

- [ ] Browser localStorage cleared
- [ ] Browser console shows "Using prompt config from environment variable: design_assistant"
- [ ] Backend logs show "[Task] Loaded prompt configuration: design_assistant"
- [ ] Asking "What is your name?" returns "Srishti"
- [ ] No mention of "HR Legal Assistant" or "Cline" in responses

## Why This Happens

The frontend's `getCurrentConfigurationKey()` prioritizes localStorage over environment variables for persistence across page reloads. However, when you change the .env file, you need to clear localStorage to force it to read the new value.

This is by design for user convenience (so selections persist), but it means env variable changes require localStorage clearing to take effect.
