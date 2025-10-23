# Diagnostic Logging for Timestamp Issue

## Date: October 23, 2025, 11:11 AM IST

## Overview

Comprehensive diagnostic logging has been added to trace the timestamp flow through the entire system, from when ClineMessages are created in Task.say() through proto conversion, gRPC handler, web-server normalization, and finally to the frontend.

## Changes Made

### 1. Proto Conversion Logging
**File:** `src/shared/proto-conversions/cline-message.ts`

Added logging in `convertClineMessageToProto()` function:
```typescript
console.log(`[DIAGNOSTIC] convertClineMessageToProto - ts: ${message.ts}, type: ${typeof message.ts}, say: ${message.say}, ask: ${message.ask}, partial: ${message.partial}`)
```

**Purpose:** Track timestamp values and types when converting from ClineMessage to proto format.

### 2. Partial Message Event Logging
**File:** `src/core/controller/ui/subscribeToPartialMessage.ts`

Added logging in `sendPartialMessageEvent()` function:
```typescript
console.log(`[DIAGNOSTIC] sendPartialMessageEvent - ts: ${partialMessage.ts}, type: ${typeof partialMessage.ts}, subscribers: ${activePartialMessageSubscriptions.size}`)
```

**Purpose:** Track timestamps before sending to subscribers, verify subscriber count.

### 3. gRPC Handler Logging
**File:** `src/core/controller/grpc-handler.ts`

Added logging in `responseStream()` function:
```typescript
const tsValue = response?.ts
const tsType = typeof tsValue
console.log(`[DIAGNOSTIC] grpc-handler responseStream - ts: ${tsValue}, type: ${tsType}, isLast: ${isLast}, request_id: ${request.request_id}`)
```

**Purpose:** Track timestamps before calling postMessageToWebview, identify if messages reach this point.

### 4. Web-Server Normalization Logging
**File:** `src/standalone/web-server.ts`

Enhanced `normalizeTimestampsForSerialization()` function:
- Added entry logging at depth 0
- Removed depth restriction (previously only logged at depth <= 2)
- Added comprehensive logging for ALL `ts` fields regardless of depth

```typescript
// Entry logging
if (depth === 0) {
    console.log(`[DIAGNOSTIC] normalizeTimestampsForSerialization ENTRY - type: ${typeof obj}, isArray: ${Array.isArray(obj)}`)
}

// Enhanced ts field logging (no depth restriction)
console.log(`[DIAGNOSTIC] normalizeTimestamps - Found 'ts' at depth ${depth}: value=${originalValue}, type=${valueType}, messageType=${obj.type || "unknown"}, say=${obj.say}, ask=${obj.ask}`)
```

**Purpose:** 
- Track if normalization function is entered
- Log EVERY timestamp field encountered at any depth
- Identify message types and their timestamp values

### 5. Task.say() Logging
**File:** `src/core/task/index.ts`

Added logging when creating and updating partial messages:
```typescript
// When updating existing partial
console.log(`[DIAGNOSTIC] Task.say() - Updating partial message: ts=${lastMessage.ts}, type=${typeof lastMessage.ts}, say=${type}`)

// When creating new partial
console.log(`[DIAGNOSTIC] Task.say() - Creating NEW partial message: ts=${sayTs}, type=${typeof sayTs}, say=${type}`)
```

**Purpose:** Track timestamp creation at the source, verify timestamps are created correctly.

## Testing Instructions

### Prerequisites
Ensure backend services are running:

```bash
# Terminal 1 - Cline Core Service
cd dist-standalone
node cline-core.js --port 8001 --host-bridge-port 26041

# Terminal 2 - Hostbridge Service  
cd dist-standalone/extension
./cli/bin/cline-host --port 26041 --verbose
```

### Test Steps

1. **Open Chrome Extension Side Panel**
   - Navigate to the Chrome extension
   - Open side panel

2. **Send a Chat Message**
   - Type "Hey" and press Enter
   - Wait for AI to start responding

3. **Monitor Backend Logs**
   Look for the diagnostic log sequence in Terminal 1:
   ```
   [DIAGNOSTIC] Task.say() - Creating NEW partial message: ts=1729595890000, type=number, say=text
   [DIAGNOSTIC] convertClineMessageToProto - ts: 1729595890000, type: number, say: text, partial: true
   [DIAGNOSTIC] sendPartialMessageEvent - ts: 1729595890000, type: number, subscribers: 1
   [DIAGNOSTIC] grpc-handler responseStream - ts: 1729595890000, type: number, isLast: false, request_id: partial_message_stream
   [DIAGNOSTIC] normalizeTimestampsForSerialization ENTRY - type: object, isArray: false
   [DIAGNOSTIC] normalizeTimestamps - Found 'ts' at depth 3: value=1729595890000, type=number, messageType=1, say=2, ask=0
   ```

4. **Check for Abnormalities**
   - ❌ If normalization is NOT entered: "normalizeTimestampsForSerialization ENTRY" should appear
   - ❌ If `ts` is 0 or invalid: "value=0" or "value=undefined"
   - ❌ If `ts` is wrong type: "type=object" instead of "type=number"
   - ❌ If normalization not reached: Missing "Found 'ts' at depth" log

5. **Monitor Chrome DevTools Console**
   - Should NOT see "Invalid timestamp in partial message" errors
   - React validation should pass

## Expected Log Flow

### Successful Flow (What We Want to See):
```
1. [DIAGNOSTIC] Task.say() - Creating NEW partial message: ts=<valid-number>, type=number, say=text
2. [DIAGNOSTIC] convertClineMessageToProto - ts: <same-number>, type: number, say: text, partial: true
3. [DIAGNOSTIC] sendPartialMessageEvent - ts: <same-number>, type: number, subscribers: 1
4. [DIAGNOSTIC] grpc-handler responseStream - ts: <same-number>, type: number, isLast: false
5. [DIAGNOSTIC] normalizeTimestampsForSerialization ENTRY - type: object, isArray: false
6. [DIAGNOSTIC] normalizeTimestamps - Found 'ts' at depth X: value=<same-number>, type=number
```

### Problem Indicators:
- **Missing normalization entry**: Suggests normalization not called
- **ts=0 or ts=undefined**: Timestamp not set correctly at source
- **type=object**: Long object not converted to number
- **Logs stop before normalization**: Message not reaching web-server

## Analysis Guide

### If Normalization Is NOT Entered:
- Check if `postMessageToWebview` in web-server is being called
- Verify gRPC handler is using the correct callback
- Check if message is taking a different code path

### If Timestamp is 0:
- Check Task.say() logs - is timestamp created correctly?
- Check if Date.now() is returning 0 (unlikely but possible)
- Look for code that might be resetting timestamp to 0

### If Timestamp is Wrong Type:
- Check proto conversion - is it preserving the type?
- Check if Long objects are being passed instead of numbers
- Verify normalization is converting Long objects correctly

### If Logs Stop Midway:
- Check for errors in console between last log and expected next log
- Verify no exceptions are thrown
- Check if message is being filtered out somewhere

## Next Steps After Testing

1. **If logs show normalization IS happening**:
   - The issue is likely in frontend React validation
   - Check ExtensionStateContext.tsx validation logic
   - May need to adjust validation or add safety checks

2. **If logs show normalization NOT happening**:
   - Issue is in backend message routing
   - Need to trace why grpc-handler isn't calling postMessageToWebview
   - May need to add normalization earlier in the flow

3. **If timestamps are invalid at source**:
   - Fix timestamp creation in Task.say()
   - Add validation immediately after Date.now()
   - Ensure timestamps are never 0 or undefined

## Success Criteria

- ✅ All diagnostic logs appear in sequence
- ✅ Timestamps are valid positive numbers throughout
- ✅ Normalization is entered and processes timestamps
- ✅ No "Invalid timestamp" errors in frontend
- ✅ Chat streaming works without errors

## Rollback

If diagnostic logging impacts performance or clutters logs, these changes can be safely removed or commented out. They are purely diagnostic and don't affect core functionality.

## Files Modified

1. `src/shared/proto-conversions/cline-message.ts`
2. `src/core/controller/ui/subscribeToPartialMessage.ts`
3. `src/core/controller/grpc-handler.ts`
4. `src/standalone/web-server.ts`
5. `src/core/task/index.ts`

## Status

✅ **DIAGNOSTIC LOGGING COMPLETE** - Ready for testing

Once testing is complete and the root cause is identified, we can proceed with the appropriate fix based on what the logs reveal.
