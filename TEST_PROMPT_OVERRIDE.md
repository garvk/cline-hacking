# 🧪 Prompt Override Testing Guide

## Current Status: ✅ All Code is Correct

### Configuration Verified
- ✅ **PromptRegistry.ts** - Properly handles SIMPLE override
- ✅ **prompt-configurations.json** - Has "design_assistant" config
- ✅ **.env** - Set to `VITE_CLINE_PROMPT_CONFIG=design_assistant`
- ✅ **types.ts** - Properly imports PromptConfiguration type

---

## 🎯 Why You're Seeing Old Prompt

**You're continuing an OLD chat** that was created with a different configuration. System prompts are **set when a task is created**, not updated for existing conversations.

---

## 🧪 How to Test Properly

### Option 1: Start a NEW Task (Recommended)

1. **Clear Browser Storage** (if using web version):
   ```javascript
   // In browser console (F12)
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Start a Fresh Chat**:
   - Click "New Task" button
   - Or restart the standalone server

3. **Test the Prompt**:
   - Ask: **"What is your name?"**
   - Expected: **"My name is Srishti"**
   - If you see "HR Legal Assistant", the override isn't working

---

### Option 2: Check Logs for Confirmation

Run this command to see if the SIMPLE override is being used:

```bash
# Restart the server with fresh logs
cd cline-hacking
npm run dev:standalone > /tmp/test-override.log 2>&1 &

# Wait a few seconds, then check logs
sleep 5
grep -i "SIMPLE\|design_assistant\|prompt config" /tmp/test-override.log
```

You should see:
```
Using SIMPLE mode with custom prompt text
```

---

### Option 3: Verify Configuration Loading

Create a new task and check the logs:

```bash
# Watch logs in real-time
tail -f /tmp/cline-core.log | grep -i "SIMPLE\|override\|design"
```

Then start a new task. You should see:
```
Using SIMPLE mode with custom prompt text
```

---

## 🐛 Troubleshooting

### Issue: Still seeing old prompt after new task

**Check 1: Is the configuration being loaded?**
```bash
grep -i "VITE_CLINE_PROMPT_CONFIG" cline-hacking/.env
# Should show: VITE_CLINE_PROMPT_CONFIG=design_assistant
```

**Check 2: Is the frontend picking it up?**
```bash
# Check frontend logs
tail -n 100 /tmp/cline-frontend.log | grep -i "prompt\|config"
```

**Check 3: Did you create a NEW task?**
- Make sure you're not continuing an old conversation
- Look for "New Task" button or restart the server

---

## 📋 Expected Behavior

### When Starting a NEW Task:

1. **Frontend** loads `.env` → Reads `VITE_CLINE_PROMPT_CONFIG=design_assistant`
2. **Frontend** loads `prompt-configurations.json` → Gets the "design_assistant" config
3. **Frontend** sends `PromptConfiguration` proto to backend when creating task
4. **Backend** receives config in `Task` proto with `promptConfiguration` field
5. **PromptRegistry.ts** checks `overrideType === PROMPT_OVERRIDE_TYPE_SIMPLE`
6. **Returns** `simplePromptText` directly: "You are Srishti..."

### Test Question & Expected Response:

**You ask:** "What is your name?"

**Expected response:**
```
My name is Srishti. I'm a highly skilled software designer and developer 
specializing in UI/UX design, frontend development, design systems, 
user experience optimization, and visual design and branding.
```

**Wrong response (old prompt):**
```
I am an HR Legal Assistant... [anything mentioning HR or Legal]
```

---

## 🔍 Debug Steps

If it's still not working after starting a NEW task:

### 1. Check Environment Variables
```bash
cd cline-hacking
cat .env | grep VITE_CLINE_PROMPT_CONFIG
```

### 2. Check if Config File Exists
```bash
cat webview-ui/public/prompt-configurations.json | jq '.configurations.design_assistant'
```

### 3. Check Runtime Logs
```bash
# Core logs
grep -i "SIMPLE\|override" /tmp/cline-core.log | tail -20

# Frontend logs
grep -i "prompt.*config" /tmp/cline-frontend.log | tail -20
```

### 4. Verify Server is Using Latest Code
```bash
# Restart the server to ensure latest code is loaded
pkill -f "node.*cline"
cd cline-hacking
npm run dev:standalone
```

---

## ✅ Success Criteria

When properly working, you should see in logs:

```
[PromptRegistry] Using SIMPLE mode with custom prompt text
```

And when you ask "What is your name?", the AI will respond with "My name is Srishti".

---

## 📝 Notes

- **Old chats** will NOT be updated with new prompts
- **Each task** stores its system prompt at creation time
- **To test**, you MUST create a **NEW task**
- **Browser caching** can interfere - clear localStorage if testing web version

---

## 🆘 Still Not Working?

If you've followed all steps and started a NEW task but still see the wrong prompt:

1. Check if there's a `.clinerules/` directory overriding the prompt
2. Verify the proto types are correctly generated
3. Check if there's a local state file storing old configuration
4. Ensure the server was restarted after making changes

---

Last Updated: 2025-11-19
