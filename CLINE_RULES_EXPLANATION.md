# Cline Rules System Explanation

## Overview

You currently have **local project-specific Cline rules** that guide my behavior when working on the Cline project. These rules explain the architecture and development workflows.

## Your Current Rules Location

**Local Project Rules**: `/Users/srishti/cline_new/cline-hacking/.clinerules/`

This directory contains:

### 1. cline-overview.md (27KB)
**Purpose**: Comprehensive Cline Extension Architecture & Development Guide

**Key Content**:
- **Project Overview**: VSCode extension with TypeScript backend and React webview frontend
- **Architecture Diagram**: Shows data flow between Extension Host, Webview UI, Storage, API Providers, and MCP Servers
- **Core Components**:
  - WebviewProvider: Manages webview lifecycle
  - Controller: Single source of truth for state
  - Task: Executes API requests and tool operations
- **State Management**: Global state, workspace state, and secrets storage
- **API Provider System**: Support for Anthropic, OpenRouter, Bedrock, Gemini, etc.
- **Task Execution**: Streaming, tool execution, error handling
- **Context Management**: Token tracking, conversation truncation
- **Plan/Act Mode**: Separate planning from execution
- **Terminal Management**: Command execution with output streaming
- **Browser Sessions**: Puppeteer automation
- **MCP Integration**: Model Context Protocol servers

**Why This Matters**: This guide ensures I understand how to properly work with the Cline codebase - where to put files, how state works, how communication flows between components.

### 2. protobuf-development.md (3.5KB)
**Purpose**: Guide for adding gRPC endpoints

**Key Content**:
- **File Structure**: One `.proto` file per feature domain
- **Message Design**: Use shared types from `common.proto` when possible
- **Naming Conventions**: PascalCase for services/messages, camelCase for RPCs
- **4-Step Workflow**:
  1. Define RPC in `.proto` file
  2. Compile with `npm run protos`
  3. Implement backend handler in `src/core/controller/`
  4. Call from webview using generated client

**Why This Matters**: This ensures I follow the correct patterns when adding new features that require communication between the webview and backend.

## Global vs Local Rules

Cline supports two types of rules:

### Global Rules
- **Location**: `~/Documents/Cline/Rules/` (currently empty for you)
- **Purpose**: Rules that apply to ALL projects/workspaces
- **Use Case**: General preferences, coding standards, communication style
- **Example**: "Always use TypeScript strict mode" or "Prefer functional programming"

### Local Rules  
- **Location**: `<workspace>/.clinerules/` (you have this)
- **Purpose**: Project-specific instructions
- **Use Case**: Architecture guides, project conventions, workflow documentation
- **Example**: Your Cline architecture and protobuf development guides

## How Rules Are Loaded

When you work on a project, Cline loads:
1. **Global Rules** from `~/Documents/Cline/Rules/` (if any exist)
2. **Local Rules** from `.clinerules/` in your workspace (your architecture guides)
3. Both are combined into my system prompt

## The HR/Legal Assistant Prompt Mismatch

You mentioned seeing an "HR Legal Assistant" prompt. This is **NOT** from your `.clinerules/` files. It's likely from:

1. **Prompt Configuration System** (we just implemented):
   - You may have selected a different configuration
   - Check Settings > Prompts tab
   - Current configurations available: default, legal assistant, HR specialist, code reviewer, data analyst

2. **Old Custom Instructions**:
   - Previously stored in VSCode global state
   - Migrated to `~/Documents/Cline/Rules/custom_instructions.md`
   - Check if this file exists

## Making Global Rules Path Customizable

Currently, the global rules path is hardcoded to:
```
~/Documents/Cline/Rules/
```

I'm about to implement environment variable support so you can customize this path:
```bash
# In .env file
CLINE_GLOBAL_RULES_DIR=/custom/path/to/rules
```

## Recommendations

1. **Check Prompt Configuration**:
   - Open Cline Settings > Prompts tab
   - Verify you're using "Default Cline" configuration
   - The HR/Legal prompt is likely from a configuration

2. **Review Global Rules**:
   ```bash
   ls -la ~/Documents/Cline/Rules/
   ```
   - Check if `custom_instructions.md` exists there
   - This may contain the HR/Legal instructions

3. **Keep Local Rules**:
   - Your `.clinerules/` files are excellent
   - They provide essential context for working on Cline
   - These are project-specific and should stay

4. **Use Environment Variables** (coming next):
   - Set custom global rules path if needed
   - Useful for multi-project setups or custom workflows

## Summary

**What You Have**:
- Excellent local project rules for Cline development
- Empty global rules directory
- Possibly an old "HR/Legal" configuration selected

**What's Being Added**:
- Environment variable `CLINE_GLOBAL_RULES_DIR` to customize global rules path
- Already completed: Prompt configuration system with UI dropdown

**Your Rules Are Working**: The architecture and protobuf guides I'm following come from your local `.clinerules/` directory - they're guiding my responses about Cline development correctly!
