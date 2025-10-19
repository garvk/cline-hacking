// Platform Initialization for Chrome Extension
// This file MUST load before React to prevent "postMessage not found" errors

// Define platform
window.__PLATFORM__ = "chrome-extension"

// Temporary stub - will be replaced by sidepanel.js once it loads
// This prevents "postMessage not found" errors during React initialization
window.chromeExtensionPostMessage = (msg) => {
	console.log("[Early Stub] chromeExtensionPostMessage called before sidepanel.js loaded, queueing...")
	if (!window.__messageQueue) window.__messageQueue = []
	window.__messageQueue.push(msg)
}

console.log("[Platform Init] Chrome extension platform initialized")
