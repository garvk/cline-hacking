# Prompt Configuration Fix - Complete Solution

## Problem Identified

The custom prompt configuration was not working because of a **state synchronization issue**:
- **Frontend** was storing the selected configuration in browser `localStorage`
- **Backend** was trying to read it from `StateManager` (SQLite database)
- These are two completely separate storage systems that don't communicate

The logs showed:
```
[Task] Attempting to load prompt config. Key from StateManager: undefined
[Task] No prompt configuration key set in StateManager
```

## Root Cause

When you selected "design_assistant" in the UI dropdown:
1. ✅ Frontend stored it in `localStorage` 
2. ❌ Frontend **never sent it** to the backend
3. ❌ Backend's `StateManager.getGlobalState("currentPromptConfigKey")` returned `undefined`
4. ❌ No custom prompt was loaded

## Solution Implemented

### 1. Added Protobuf Field (proto/cline/state.proto)
Added `currentPromptConfigKey` to the `UpdateSettingsRequest` message:
```protobuf
message UpdateSettingsRequest {
  // ... existing fields ...
  optional string current_prompt_config_key = 26;
}
```

### 2. Updated Frontend Component (webview-ui/src/components/settings/sections/PromptSettingsSection.tsx)
Added API call to sync the configuration to backend:
```typescript
import { updateSetting } from "../utils/settingsHandlers"

const handleConfigChange = async (event: any) => {
    const selectedKey = event.target.value
    setCurrentConfig(selectedKey)
    promptConfigLoader.setCurrentConfiguration(selectedKey)  // localStorage
    
    // NEW: Sync to backend StateManager
    updateSetting("currentPromptConfigKey", selectedKey)
    
    // ... rest of code
}
```

### 3. Updated Backend Handler (src/core/controller/state/updateSettings.ts)
Added handler to save the configuration to StateManager:
```typescript
// Update current prompt config key
if (request.currentPromptConfigKey !== undefined) {
    console.log(`[updateSettings] Setting currentPromptConfigKey to: ${request.currentPromptConfigKey}`)
    controller.stateManager.setGlobalState("currentPromptConfigKey", request.currentPromptConfigKey)
}
```

### 4. Rebuilt Protobuf Files
Ran `npm run protos` to regenerate TypeScript types from the updated protobuf definition.

## Files Modified

1. **proto/cline/state.proto** - Added `current_prompt_config_key` field
2. **webview-ui/src/components/settings/sections/PromptSettingsSection.tsx** - Added `updateSetting()` call
3. **src/core/controller/state/updateSettings.ts** - Added handler to save to StateManager
4. **Generated files** (via `npm run protos`):
   - src/shared/proto/cline/state.ts
   - webview-ui/src/services/grpc-client.ts
   - And other generated protobuf files

## Testing Instructions

### 1. Rebuild and Restart Services
```bash
cd /Users/srishti/cline_new/cline-hacking
./start-standalone.sh
```

### 2. Select Custom Configuration
1. Open http://localhost:25463
2. Go to Settings
3. Find "Prompt Configuration" dropdown
4. Select "Default Designer your names is srishti" (design_assistant)
5. Check browser console - should see: `Prompt configuration changed to: design_assistant`

### 3. Create New Task
Click "New Task" or start a fresh conversation

### 4. Verify in Logs
```bash
# Check backend received the configuration
grep "currentPromptConfigKey" /tmp/cline-core.log

# Should see:
# [updateSettings] Setting currentPromptConfigKey to: design_assistant
# [Task] Attempting to load prompt config. Key from StateManager: design_assistant
# [Task] ✅ Successfully loaded prompt configuration: design_assistant
```

### 5. Test Assistant Behavior
Ask: "What is your name?"

**Expected Response**: "I am Srishti, a highly skilled software designer and developer..."  
**Not**: "I am Cline..."

## Architecture Overview

```
┌─────────────────────────┐
│   Frontend (Browser)    │
│  ┌──────────────────┐   │
│  │ PromptSettings   │   │
│  │   Component      │   │
│  └─────┬────────────┘   │
│        │                 │
│   ┌────▼─────┐  ┌─────┐│
│   │localStorage│  │gRPC ││
│   └──────────┘  └──┬──┘│
└────────────────────┼────┘
                     │
        ┌────────────▼──────────────┐
        │  updateSettings RPC       │
        │  (currentPromptConfigKey) │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────┐
        │   Backend                 │
        │  ┌──────────────────┐     │
        │  │  StateManager    │     │
        │  │  (SQLite DB)     │     │
        │  └────────┬─────────┘     │
        │           │                │
        │  ┌────────▼─────────┐     │
        │  │  Task Instance   │     │
        │  │  loads config    │     │
        │  └──────────────────┘     │
        └───────────────────────────┘
```

## Key Points

1. **Dual Storage**: Frontend uses `localStorage` for immediate UI updates, backend uses `StateManager` for persistence
2. **Sync Required**: Frontend must explicitly send the value to backend via `updateSettings` RPC
3. **Per-Task Loading**: Configuration is loaded when each Task instance is created
4. **State Keys Already Existed**: The `currentPromptConfigKey` was already defined in `state-keys.ts` Settings interface, but never populated

## Removed Environment Variable Approach

The old approach using `CLINE_PROMPT_CONFIG` and `VITE_CLINE_PROMPT_CONFIG` environment variables has been removed. The StateManager-based approach is now the standard method.

## Troubleshooting

If it still doesn't work:

1. **Check logs are being written**:
   ```bash
   tail -f /tmp/cline-core.log
   ```

2. **Verify StateManager has the value**:
   Look for: `[updateSettings] Setting currentPromptConfigKey to: design_assistant`

3. **Check Task initialization**:
   Look for: `[Task] Successfully loaded prompt configuration: design_assistant`

4. **Clear browser storage** (if needed):
   ```javascript
   localStorage.clear()
   ```
   Then reselect the configuration

5. **Verify configuration file exists**:
   ```bash
   cat webview-ui/public/prompt-configurations.json
   ```

## Success Criteria

✅ Dropdown selection triggers both localStorage AND gRPC call  
✅ Backend logs show configuration received  
✅ Task logs show configuration loaded  
✅ Assistant responds with custom identity (Srishti, not Cline)
