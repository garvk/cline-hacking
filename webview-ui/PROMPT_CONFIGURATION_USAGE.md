# Prompt Configuration Usage Guide

## Overview

The Cline webview UI now includes a comprehensive prompt configuration system that allows customization of agent behavior through JSON configurations. This system supports both SIMPLE mode (complete prompt replacement) and COMPLEX mode (component and tool-level customization).

## File Locations

- **Configuration File**: `cline-hacking/webview-ui/public/prompt-configurations.json`
- **Loader Service**: `cline-hacking/webview-ui/src/services/prompt-config-loader.ts`
- **Initialization**: `cline-hacking/webview-ui/src/main.tsx`

## Configuration Structure

### JSON Format

```json
{
  "configurations": {
    "config_key": {
      "name": "Display Name",
      "description": "Configuration description",
      "config": {
        "overrideType": "PROMPT_OVERRIDE_TYPE_SIMPLE | PROMPT_OVERRIDE_TYPE_COMPLEX",
        "simplePromptText": "Complete prompt text (SIMPLE mode only)",
        "componentOverrides": { /* component customizations */ },
        "enableToolOverrides": true,
        "toolOverrides": { /* tool customizations */ },
        "disabledComponents": ["component_id"],
        "disabledTools": ["tool_id"]
      }
    }
  },
  "metadata": {
    "version": "1.0.0",
    "lastUpdated": "2025-11-12",
    "description": "Metadata about configurations"
  }
}
```

## Available Configurations

### 1. Default Cline
- **Key**: `default`
- **Mode**: Unspecified (uses default behavior)
- **Use Case**: Standard Cline with no customizations

### 2. Legal Assistant (SIMPLE Mode)
- **Key**: `simple_legal_assistant`
- **Mode**: SIMPLE
- **Features**: Complete prompt replacement for legal document analysis
- **Capabilities**: Contract review, legal research, document drafting

### 3. HR Specialist (COMPLEX Mode - Component Override)
- **Key**: `hr_specialist`
- **Mode**: COMPLEX
- **Features**: Custom agent role, rules, and capabilities
- **Disabled**: browser_action, web_fetch tools
- **Use Case**: HR tasks with compliance and confidentiality focus

### 4. Code Reviewer (COMPLEX Mode - Tool Override)
- **Key**: `code_reviewer`
- **Mode**: COMPLEX
- **Features**: Custom tool descriptions for code review
- **Tool Overrides**: read_file, search_files, write_to_file
- **Disabled**: execute_command, browser_action
- **Use Case**: Secure code review without command execution

### 5. Data Analyst
- **Key**: `data_analyst`
- **Mode**: COMPLEX
- **Features**: Statistical analysis focus
- **Disabled**: execute_command, browser_action
- **Use Case**: Data analysis with security restrictions

## Configuration Selection Methods

### Method 1: Using the Settings UI (Recommended)

1. Open Cline settings by clicking the settings icon
2. Navigate to the "Prompts" tab (second tab after API Configuration)
3. Select your desired configuration from the dropdown
4. The selection is automatically saved to localStorage
5. Changes take effect on the next task

### Method 2: Using Environment Variable

Set the `VITE_CLINE_PROMPT_CONFIG` environment variable in your `.env` file:

```bash
# In .env file
VITE_CLINE_PROMPT_CONFIG=hr_specialist
```

Available values:
- `default` - Standard Cline behavior
- `simple_legal_assistant` - Legal document analysis
- `hr_specialist` - HR tasks with compliance focus
- `code_reviewer` - Secure code review
- `data_analyst` - Statistical data analysis

**Priority Order**: localStorage > environment variable > default

### Method 3: Programmatic Access

## Using the Prompt Config Loader

### Import the Service

```typescript
import { promptConfigLoader } from './services/prompt-config-loader'
```

### Get All Configuration Keys

```typescript
const keys = await promptConfigLoader.getAllConfigurationKeys()
// Returns: ["default", "simple_legal_assistant", "hr_specialist", ...]
```

### Get a Specific Configuration

```typescript
const config = await promptConfigLoader.getConfiguration('hr_specialist')
console.log(config.name) // "HR Specialist (Component Override)"
console.log(config.config.componentOverrides) // Component customizations
```

### Get Current Configuration

```typescript
const current = await promptConfigLoader.getCurrentConfiguration()
// Returns the currently selected configuration
```

### Set Current Configuration

```typescript
promptConfigLoader.setCurrentConfiguration('code_reviewer')
// Stores selection in localStorage as 'cline_prompt_config'
```

### Get Current Configuration Key

```typescript
const key = promptConfigLoader.getCurrentConfigurationKey()
// Returns: "code_reviewer" (or whatever is selected)
```

## Integration with Cline Core

### How It Works

1. **Webview Startup**: `main.tsx` initializes the configuration loader
2. **Configuration Loading**: JSON file is fetched from `/prompt-configurations.json`
3. **Local Storage**: Selected configuration is persisted
4. **Console Logging**: All operations are logged for debugging

### Initialization (Already Done)

The configuration loader is automatically initialized in `main.tsx`:

```typescript
promptConfigLoader.loadConfigurations().then((configs) => {
  console.log("Prompt configurations loaded:", Object.keys(configs.configurations))
  const currentConfig = promptConfigLoader.getCurrentConfigurationKey()
  console.log("Current prompt configuration:", currentConfig)
})
```

## Creating a UI Component for Configuration Selection

### Example Component (To Be Created)

```typescript
import { useState, useEffect } from 'react'
import { promptConfigLoader, PromptConfiguration } from '../services/prompt-config-loader'

export function PromptConfigSelector() {
  const [configs, setConfigs] = useState<string[]>([])
  const [current, setCurrent] = useState<string>('default')
  const [details, setDetails] = useState<PromptConfiguration | null>(null)

  useEffect(() => {
    loadConfigs()
  }, [])

  async function loadConfigs() {
    const keys = await promptConfigLoader.getAllConfigurationKeys()
    setConfigs(keys)
    const currentKey = promptConfigLoader.getCurrentConfigurationKey()
    setCurrent(currentKey)
    const config = await promptConfigLoader.getCurrentConfiguration()
    setDetails(config)
  }

  async function handleChange(key: string) {
    promptConfigLoader.setCurrentConfiguration(key)
    setCurrent(key)
    const config = await promptConfigLoader.getConfiguration(key)
    setDetails(config)
    // Optionally: Reload the app or notify Cline Core
  }

  return (
    <div className="prompt-config-selector">
      <h3>Prompt Configuration</h3>
      <select value={current} onChange={(e) => handleChange(e.target.value)}>
        {configs.map(key => (
          <option key={key} value={key}>{key}</option>
        ))}
      </select>
      {details && (
        <div className="config-details">
          <h4>{details.name}</h4>
          <p>{details.description}</p>
          <p><strong>Mode:</strong> {details.config.overrideType}</p>
        </div>
      )}
    </div>
  )
}
```

## Adding New Configurations

### Step 1: Edit the JSON File

Add a new configuration to `prompt-configurations.json`:

```json
{
  "configurations": {
    "my_custom_agent": {
      "name": "My Custom Agent",
      "description": "Custom agent for specific tasks",
      "config": {
        "overrideType": "PROMPT_OVERRIDE_TYPE_COMPLEX",
        "componentOverrides": {
          "agentRole": "You are a specialized assistant for...",
          "rules": "Custom rules:\n- Rule 1\n- Rule 2"
        },
        "disabledTools": ["browser_action"]
      }
    }
  }
}
```

### Step 2: Configuration Will Auto-Load

The configuration will be automatically available after:
1. Saving the JSON file
2. Refreshing the webview
3. Loader will detect new configuration

## Testing

### Console Output

When the webview loads, check the browser console:

```
Prompt configurations initialized
Loaded prompt configurations: { configurations: {...}, metadata: {...} }
Prompt configurations loaded: ["default", "simple_legal_assistant", ...]
Current prompt configuration: default
```

### LocalStorage

Check browser localStorage for:
- Key: `cline_prompt_config`
- Value: Current configuration key (e.g., "hr_specialist")

### Programmatic Testing

```typescript
// In browser console
await promptConfigLoader.getAllConfigurationKeys()
await promptConfigLoader.getConfiguration('code_reviewer')
promptConfigLoader.setCurrentConfiguration('hr_specialist')
```

## Component ID Reference

### Available Component IDs
- `agentRole` - Agent identity and capabilities
- `toolUse` - Tool usage guidelines
- `todo` - TODO list management
- `mcp` - MCP integration rules
- `editingFiles` - File editing guidelines
- `actVsPlan` - PLAN MODE vs ACT MODE
- `taskProgress` - Task progress tracking
- `capabilities` - Agent capabilities
- `feedback` - Feedback handling
- `rules` - Custom behavior rules
- `systemInfo` - System information
- `objective` - Task objective
- `userInstructions` - User instructions

### Available Tool IDs
- `execute_command`, `read_file`, `write_to_file`
- `replace_in_file`, `search_files`, `list_files`
- `list_code_definition_names`, `browser_action`
- `ask_followup_question`, `attempt_completion`
- `use_mcp_tool`, `access_mcp_resource`
- `web_fetch`, `new_task`, `plan_mode_respond`
- `load_mcp_documentation`

## Best Practices

1. **SIMPLE Mode**: Use for completely custom agents with unique behavior
2. **COMPLEX Mode**: Use for targeted customizations while keeping Cline defaults
3. **Component Overrides**: Customize specific sections without affecting others
4. **Tool Overrides**: Modify tool descriptions for specific use cases
5. **Disabled Tools**: Remove dangerous tools for security-sensitive agents
6. **LocalStorage**: Configuration selection persists across sessions
7. **Fallback**: System always falls back to "default" if configuration fails

## Troubleshooting

### Configuration Not Loading
- Check if `prompt-configurations.json` exists in `/public/`
- Check browser console for errors
- Verify JSON is valid

### Configuration Not Persisting
- Check browser localStorage
- Ensure `setCurrentConfiguration()` is called
- Check for localStorage permissions

### Wrong Configuration Active
- Call `promptConfigLoader.getCurrentConfigurationKey()` to verify
- Check localStorage: `localStorage.getItem('cline_prompt_config')`
- Clear and reset: `localStorage.removeItem('cline_prompt_config')`

## Future Enhancements

- UI component for configuration selection (dropdown/selector)
- Real-time configuration switching without reload
- Configuration export/import functionality
- Validation of configuration structure
- Hot-reload of configurations during development
- Integration with Cline Core's TaskSettings proto

---

**Status**: Configuration system is ready for use
**Location**: `cline-hacking/webview-ui`
**Version**: 1.0.0
**Last Updated**: November 12, 2025
