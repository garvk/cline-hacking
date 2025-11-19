# Cline User Data Storage

This document explains where Cline stores user data and why build processes don't affect your configuration files.

## User Data Directory Structure

### CLINE_DIR (Default: `~/.cline`)

This is the **primary user data directory** where all your settings, MCP configurations, and task history are stored. This directory is **completely separate** from the Cline source code and build directories.

**Default location:** `~/.cline` (or `~/.cline/data` for some components)

**Contents:**
```
~/.cline/
├── data/
│   ├── globalState.json         # Extension global state
│   ├── secrets.json             # Encrypted secrets (API keys)
│   ├── cline_mcp_settings.json  # MCP server configurations
│   ├── workspace/               # Workspace-specific data
│   └── tasks/                   # Task history and conversations
└── state/
    └── taskHistory.json         # List of all tasks
```

### Global Rules Directory (Default: `~/Documents/Cline/Rules/`)

This is where your **global Cline rules** are stored - rules that apply across all projects.

**Default location:** `~/Documents/Cline/Rules/`

**Contents:**
```
~/Documents/Cline/Rules/
├── rule1.md
├── rule2.md
└── ...
```

### Local Workspace Rules

Each workspace can have its own **local rules** that only apply to that specific project.

**Location:** `<workspace>/.clinerules/`

**Contents:**
```
<your-project>/.clinerules/
├── project-specific-rule.md
└── ...
```

## Build Process and User Data

### What Build Scripts Do

The build scripts (`scripts/package-standalone.mjs`, `scripts/build-extension-vite.mjs`) only:
1. Compile TypeScript source code
2. Bundle the extension
3. Copy static runtime files from `standalone/runtime-files/`
4. Package everything for distribution

### What Build Scripts DO NOT Do

Build scripts **DO NOT**:
- Touch your `~/.cline` directory
- Modify your MCP settings at `~/.cline/data/cline_mcp_settings.json`
- Touch your global rules at `~/Documents/Cline/Rules/`
- Modify any workspace `.clinerules` files
- Reset any user configuration or data

## File Initialization vs. Overwriting

### MCP Settings (`cline_mcp_settings.json`)

The file is created with a default empty structure **only if it doesn't exist**:

```typescript
// From src/services/mcp/McpHub.ts
async getMcpSettingsFilePath(): Promise<string> {
    const mcpSettingsFilePath = path.join(await this.getSettingsDirectoryPath(), GlobalFileNames.mcpSettings)
    const fileExists = await fileExistsAtPath(mcpSettingsFilePath)
    if (!fileExists) {
        // Only creates if file doesn't exist
        await fs.writeFile(mcpSettingsFilePath, '{\n  "mcpServers": {\n    \n  }\n}')
    }
    return mcpSettingsFilePath
}
```

**Key Point:** If the file already exists, it is never overwritten during initialization.

## Customizing Storage Locations

You can customize where Cline stores data using environment variables:

### CLINE_DIR

Set the base directory for all user data:

```bash
# In your .env file or shell
export CLINE_DIR=~/custom/cline/data
```

This affects:
- MCP settings location
- Task history location
- Global state location
- All user configuration

### CLINE_GLOBAL_RULES_DIR

Set a custom location for global rules:

```bash
# In your .env file or shell
export CLINE_GLOBAL_RULES_DIR=~/custom/rules/directory
```

## Troubleshooting "Files Being Reset"

If you're experiencing files being reset on each build, check:

### 1. Verify Your Data Location

Check where your actual user data is stored:

```bash
# macOS/Linux
ls -la ~/.cline/data/

# Check if MCP settings exist
cat ~/.cline/data/cline_mcp_settings.json
```

### 2. Check Environment Variables

Make sure you're not accidentally overriding CLINE_DIR:

```bash
# Check current value
echo $CLINE_DIR

# If it's set to a build directory, that's the problem
# Unset it or set it to the correct location
export CLINE_DIR=~/.cline
```

### 3. Verify You're Not Editing Files in the Build Directory

The build output directories (`dist-standalone/`, `dist-extension/`) are **temporary** and are regenerated on each build.

**Wrong:** Editing files in `dist-standalone/` or `dist-extension/`
**Correct:** Your user data in `~/.cline/` is preserved across builds

### 4. Local Rules Location

Workspace-specific rules should be in:
```
<your-project>/.clinerules/
```

NOT in:
```
<cline-source>/cline-hacking/.clinerules/  # Wrong - this is for Cline development
```

## Summary

✅ **User data is safe:** Stored in separate directories (`~/.cline`, `~/Documents/Cline/`)
✅ **Builds don't affect data:** Build scripts only touch source code and output directories
✅ **Files are never overwritten:** Initialization only creates files if they don't exist
✅ **Customizable locations:** Use environment variables to change storage locations

❌ **Don't edit files in:** `dist-standalone/`, `dist-extension/`, or any build output directory
❌ **These are regenerated:** on every build and your changes will be lost

## Configuration File Paths Reference

| File | Default Location | Environment Variable |
|------|-----------------|---------------------|
| MCP Settings | `~/.cline/data/cline_mcp_settings.json` | `CLINE_DIR` |
| Global State | `~/.cline/data/globalState.json` | `CLINE_DIR` |
| Task History | `~/.cline/state/taskHistory.json` | `CLINE_DIR` |
| Global Rules | `~/Documents/Cline/Rules/` | `CLINE_GLOBAL_RULES_DIR` |
| Local Rules | `<workspace>/.clinerules/` | N/A (workspace-relative) |

## Need Help?

If you're still experiencing issues with files being reset:

1. Check that CLINE_DIR is set correctly (or not set at all to use the default)
2. Verify your files exist in `~/.cline/data/` not in a build directory
3. Make sure you're running Cline (the extension), not accidentally editing files in the source directory
4. Check file permissions on your `~/.cline` directory
