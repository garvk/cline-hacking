# Prompt Configuration - State Manager Implementation

## ✅ Overview

The prompt configuration system now uses the **StateManager** instead of environment variables. This provides a more robust, persistent, and user-friendly way to manage prompt configurations.

---

## 🔧 Changes Made

### 1. **Removed Environment Variable Dependency**

**File:** `src/core/task/index.ts`

**Before:**
```typescript
// Fallback to environment variable if not set in state
if (!currentPromptConfigKey && process.env.CLINE_PROMPT_CONFIG) {
    currentPromptConfigKey = process.env.CLINE_PROMPT_CONFIG
    console.log(`[Task] Using prompt config from environment variable: ${currentPromptConfigKey}`)
}
```

**After:**
```typescript
// Load prompt configuration from state manager
let promptConfiguration: any = undefined
const currentPromptConfigKey = this.stateManager.getGlobalSettingsKey("currentPromptConfigKey")
```

The system now **only** reads from StateManager, making configuration persistent across sessions and eliminating the need for environment variables.

---

### 2. **Updated Environment Files**

**Files:** `.env` and `.env.example`

- **Removed:** `CLINE_PROMPT_CONFIG` and `VITE_CLINE_PROMPT_CONFIG` variables
- **Reason:** These are no longer needed since configuration is stored in StateManager

---

## 📋 How It Works

### State Manager Integration

The prompt configuration is stored as a **global setting** in StateManager:

```typescript
// In state-keys.ts
export interface Settings {
    // ... other settings
    currentPromptConfigKey: string | undefined  // Key of the currently selected prompt configuration
    // ... other settings
}
```

### Configuration Flow

1. **Task Initialization** (`Task.ts`)
   - Reads `currentPromptConfigKey` from StateManager
   - Loads the corresponding prompt configuration using `loadPromptConfiguration()`
   - Passes configuration to the system prompt generator

2. **State Persistence**
   - StateManager automatically persists the setting to disk
   - Configuration survives application restarts
   - No manual file editing required

3. **Frontend/UI Integration**
   - UI can update the setting using `stateManager.setGlobalState("currentPromptConfigKey", "design_assistant")`
   - Changes are debounced and written to disk automatically

---

## 🎯 How to Set Prompt Configuration

### Option 1: Via UI (Recommended)

When the UI for prompt configuration is implemented, users will be able to:
1. Open settings
2. Select a prompt configuration from a dropdown
3. Changes are automatically saved

### Option 2: Programmatically

```typescript
// In your code
const stateManager = StateManager.get()
stateManager.setGlobalState("currentPromptConfigKey", "design_assistant")
```

### Option 3: Via API Configuration

```typescript
// When building API configuration
const apiConfig = stateManager.getApiConfiguration()
// The currentPromptConfigKey is available as a global setting
const promptKey = stateManager.getGlobalSettingsKey("currentPromptConfigKey")
```

---

## 📝 Available Prompt Configurations

Based on `prompt-configurations.json`, these are the available configurations:

- `design_assistant` - Design-focused assistant
- `simple_legal_assistant` - Legal assistant
- `hr_specialist` - HR specialist
- `code_reviewer` - Code review assistant  
- `data_analyst` - Data analysis assistant

---

## 🔍 Benefits of State Manager Approach

### 1. **Persistence**
   - Configuration survives application restarts
   - No need to set environment variables each time

### 2. **User-Friendly**
   - Can be changed through UI without editing files
   - Immediate effect without restarting

### 3. **Consistent**
   - Single source of truth (StateManager)
   - No confusion between env vars and state

### 4. **Debuggable**
   - Settings are stored in a readable JSON format
   - Easy to inspect and troubleshoot

### 5. **Type-Safe**
   - TypeScript interfaces ensure type safety
   - IDE autocomplete support

---

## 🧪 Testing

To verify the prompt configuration is working:

1. **Check StateManager Storage:**
   ```bash
   # State is typically stored in VS Code's globalState
   # Location varies by platform:
   # macOS: ~/Library/Application Support/Code/User/globalStorage/
   # Linux: ~/.config/Code/User/globalStorage/
   # Windows: %APPDATA%\Code\User\globalStorage\
   ```

2. **Check Console Logs:**
   ```bash
   # Look for these log messages in the console:
   [Task] Loaded prompt configuration: design_assistant
   # OR
   [Task] Failed to load prompt configuration: <key>
   ```

3. **Verify in Code:**
   ```typescript
   const currentKey = this.stateManager.getGlobalSettingsKey("currentPromptConfigKey")
   console.log("Current prompt config:", currentKey)
   ```

---

## 🔄 Migration Guide

### For Existing Users

If you were using environment variables:

1. **Remove from `.env`:**
   ```bash
   # Remove these lines:
   # CLINE_PROMPT_CONFIG=design_assistant
   # VITE_CLINE_PROMPT_CONFIG=design_assistant
   ```

2. **Set via StateManager:**
   ```typescript
   // In your initialization code
   stateManager.setGlobalState("currentPromptConfigKey", "design_assistant")
   ```

3. **Restart the Application:**
   - Settings will be persisted automatically
   - No need to set environment variables again

---

## 🐛 Troubleshooting

### Configuration Not Loading

**Symptom:** Prompt configuration not being applied

**Solutions:**
1. Check if `currentPromptConfigKey` is set:
   ```typescript
   const key = stateManager.getGlobalSettingsKey("currentPromptConfigKey")
   console.log("Prompt key:", key)
   ```

2. Verify the configuration file exists:
   ```bash
   ls -la webview-ui/public/prompt-configurations.json
   ```

3. Check console for error messages:
   ```
   [Task] Error loading prompt configuration: <error>
   ```

### Configuration Not Persisting

**Symptom:** Configuration resets after restart

**Solutions:**
1. Ensure StateManager is properly initialized
2. Check write permissions on state directory
3. Verify debounced persistence is completing:
   ```typescript
   // StateManager uses 500ms debounce delay
   // Wait at least 500ms after setting before exiting
   ```

---

## 📚 Related Files

- **State Keys:** `src/core/storage/state-keys.ts`
- **State Manager:** `src/core/storage/StateManager.ts`
- **Task Implementation:** `src/core/task/index.ts`
- **Prompt Loader:** `src/core/prompts/prompt-config-loader.ts`
- **Prompt Configurations:** `webview-ui/public/prompt-configurations.json`

---

## 🎓 Architecture Notes

### Why StateManager?

1. **Centralized State:** All application state in one place
2. **Automatic Persistence:** No manual file I/O required
3. **Type Safety:** Full TypeScript support
4. **Debounced Writes:** Efficient disk I/O
5. **Cache Layer:** Fast in-memory access

### State Storage Location

- **Global State:** Stored in VS Code's `globalState` (cross-workspace)
- **Workspace State:** Stored in VS Code's `workspaceState` (per-workspace)
- **Secrets:** Stored in VS Code's `SecretStorage` (encrypted)

The `currentPromptConfigKey` is stored as a **global setting**, meaning it applies across all workspaces unless overridden at the task level.

---

## ✨ Future Enhancements

1. **UI Integration:** Add prompt configuration selector in settings
2. **Per-Task Override:** Allow tasks to override global prompt config
3. **Custom Prompts:** Support user-defined prompt configurations
4. **Import/Export:** Share prompt configurations between instances
5. **Validation:** Validate prompt config keys on save

---

## 📖 Summary

The prompt configuration system now uses StateManager for persistent, user-friendly configuration management. This eliminates the need for environment variables and provides a more robust solution that integrates seamlessly with the rest of the application's state management.

**Key Takeaway:** Use `stateManager.setGlobalState("currentPromptConfigKey", "<key>")` to set the prompt configuration, and it will persist automatically.
