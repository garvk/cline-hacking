// Platform Initialization for Chrome Extension
// This file must load BEFORE any other scripts to prevent race conditions

// Define platform type - but use "standalone" to share code path
window.__PLATFORM__ = "standalone"

// The standalone-bridge.js (loaded from backend) will create window.standalonePostMessage
// No need to create stub here - the bridge loads immediately after this script

console.log("[Platform Init] Chrome extension environment initialized (using standalone code path)")
