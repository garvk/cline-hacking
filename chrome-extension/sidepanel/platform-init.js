// Platform Initialization for Chrome Extension
// This file must load BEFORE any other scripts to prevent race conditions

// Define platform type
window.__PLATFORM__ = "chrome-extension"

// Create a message queue for early messages
window.__messageQueue = []

// Temporary stub - will be replaced by sidepanel.js once WebSocket connects
// This prevents "postMessage not found" errors during React initialization
window.chromeExtensionPostMessage = (msg) => {
	console.log("[Platform Init] chromeExtensionPostMessage called before WebSocket ready, queueing...")
	window.__messageQueue.push(msg)
}

console.log("[Platform Init] Chrome extension environment initialized")
