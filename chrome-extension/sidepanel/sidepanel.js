// Side Panel Controller - Manages the Cline React app in Chrome extension context
// Handles backend connection status and app initialization

class SidePanelController {
	constructor() {
		this.backendConnected = false
		this.appLoaded = false
		this.setupEventListeners()
		this.initialize()
	}

	setupEventListeners() {
		// Backend status buttons
		document.getElementById("retry-connection")?.addEventListener("click", () => {
			this.checkBackendConnection()
		})

		document.getElementById("show-setup")?.addEventListener("click", () => {
			this.toggleSetupInstructions()
		})

		// Listen for storage changes (backend status updates)
		if (chrome.storage) {
			chrome.storage.local.onChanged.addListener((changes) => {
				if (changes["backend-status"]) {
					this.updateBackendStatus(changes["backend-status"].newValue)
				}
			})
		}

		// Listen for messages from background script
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			this.handleMessage(message, sender, sendResponse)
			return true
		})

		// Handle window resize for responsive design
		window.addEventListener("resize", () => {
			this.handleResize()
		})
	}

	async initialize() {
		console.log("[SidePanel] Initializing...")

		try {
			// Show loading state
			this.showLoading("Initializing extension...")

			// Check backend connection
			await this.checkBackendConnection()

			// Initialize the Chrome extension message bridge
			this.initializeMessageBridge()

			// Load the React app
			await this.loadClineApp()
		} catch (error) {
			console.error("[SidePanel] Initialization failed:", error)
			this.showError("Failed to initialize extension", error.message)
		}
	}

	async checkBackendConnection() {
		console.log("[SidePanel] Checking backend connection...")
		this.updateLoadingText("Checking backend connection...")

		try {
			// Request backend status from background script
			const response = await chrome.runtime.sendMessage({
				type: "GET_BACKEND_STATUS",
			})

			if (response?.success && response.status) {
				this.updateBackendStatus(response.status)
			} else {
				this.updateBackendStatus({
					connected: false,
					message: "Failed to check backend status",
				})
			}
		} catch (error) {
			console.error("[SidePanel] Backend status check failed:", error)
			this.updateBackendStatus({
				connected: false,
				message: "Extension communication error",
				error: error.message,
			})
		}
	}

	updateBackendStatus(status) {
		console.log("[SidePanel] Backend status update:", status)

		const statusBar = document.getElementById("backend-status")
		const statusIndicator = document.getElementById("status-indicator")
		const statusText = document.getElementById("status-text")
		const retryButton = document.getElementById("retry-connection")
		const setupButton = document.getElementById("show-setup")

		this.backendConnected = status.connected

		// Update status bar appearance
		statusBar.classList.remove("backend-connected", "backend-disconnected", "backend-error")
		statusIndicator.classList.remove("status-connected", "status-disconnected", "status-error")

		if (status.connected) {
			statusBar.classList.add("backend-connected")
			statusIndicator.classList.add("status-connected")
			statusText.textContent = "Backend connected - Full functionality available"
			retryButton.style.display = "none"
			setupButton.style.display = "none"
		} else {
			statusBar.classList.add("backend-disconnected")
			statusIndicator.classList.add("status-disconnected")
			statusText.textContent = status.message || "Backend disconnected - Limited functionality"
			retryButton.style.display = "inline-block"
			setupButton.style.display = "inline-block"
		}

		// If app is already loaded, notify it of status change
		if (this.appLoaded && window.clineApp) {
			window.clineApp.updateBackendStatus?.(status)
		}
	}

	initializeMessageBridge() {
		console.log("[SidePanel] Setting up Chrome extension message bridge...")

		// Create the global postMessage function that the React app expects
		window.chromeExtensionPostMessage = (messageString) => {
			console.log("[SidePanel] Sending message to background:", messageString.slice(0, 200) + "...")

			try {
				const message = JSON.parse(messageString)

				chrome.runtime.sendMessage(
					{
						type: "GRPC_REQUEST",
						data: message,
					},
					(response) => {
						if (chrome.runtime.lastError) {
							console.error("[SidePanel] Chrome extension error:", chrome.runtime.lastError)
							return
						}

						console.log("[SidePanel] Received response:", response?.success ? "Success" : "Failed")

						// Dispatch response back to React app
						if (response?.success) {
							window.dispatchEvent(
								new MessageEvent("message", {
									data: response.data,
								}),
							)
						} else if (response?.fallbackMode) {
							// Handle backend unavailable state
							window.dispatchEvent(
								new MessageEvent("message", {
									data: {
										type: "backend_unavailable",
										message: response.statusMessage,
										setupInstructions: response.setupInstructions,
									},
								}),
							)
						} else {
							// Handle general errors
							window.dispatchEvent(
								new MessageEvent("message", {
									data: {
										type: "error",
										message: response?.error || "Unknown error",
									},
								}),
							)
						}
					},
				)
			} catch (error) {
				console.error("[SidePanel] Error parsing message:", error)
			}
		}

		// Set up platform configuration for chrome-extension mode
		window.__PLATFORM__ = "chrome-extension"

		console.log("[SidePanel] Message bridge initialized")
	}

	async loadClineApp() {
		console.log("[SidePanel] Loading Cline React app...")
		this.updateLoadingText("Loading Cline interface...")

		try {
			// For now, we'll create a placeholder until the React app is bundled
			// In the webpack build, this will load the actual cline-app.js bundle

			// Check if the React app bundle is available
			const appScript = document.createElement("script")
			appScript.src = "cline-app.js"
			appScript.onerror = () => {
				console.log("[SidePanel] React app bundle not found, showing placeholder")
				this.showPlaceholderApp()
			}
			appScript.onload = () => {
				console.log("[SidePanel] React app loaded successfully")
				this.appLoaded = true
				this.hideLoading()
			}

			// Try to load the React app bundle
			document.head.appendChild(appScript)

			// Fallback: show placeholder after timeout
			setTimeout(() => {
				if (!this.appLoaded) {
					console.log("[SidePanel] React app load timeout, showing placeholder")
					this.showPlaceholderApp()
				}
			}, 3000)
		} catch (error) {
			console.error("[SidePanel] Error loading React app:", error)
			this.showPlaceholderApp()
		}
	}

	showPlaceholderApp() {
		console.log("[SidePanel] Showing placeholder app")

		const clineRoot = document.getElementById("cline-root")
		const loadingContainer = document.getElementById("loading-container")

		if (loadingContainer) {
			loadingContainer.remove()
		}

		clineRoot.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #ccc;">
        <h2 style="color: #007acc; margin-bottom: 20px;">Cline AI Assistant</h2>
        <p>React app bundle not loaded yet.</p>
        <p style="font-size: 14px; color: #888; margin-top: 20px;">
          This placeholder will be replaced with the full Cline interface once the webpack build is configured.
        </p>
        
        <div style="margin-top: 30px; padding: 20px; border: 1px solid #444; border-radius: 8px; background: rgba(255,255,255,0.05);">
          <h3 style="color: #4fc3f7; margin-bottom: 15px;">Development Status</h3>
          <div style="text-align: left; max-width: 400px; margin: 0 auto;">
            <p style="margin: 8px 0;"><span style="color: #28a745;">✅</span> Extension structure created</p>
            <p style="margin: 8px 0;"><span style="color: #28a745;">✅</span> Manifest configuration</p>
            <p style="margin: 8px 0;"><span style="color: #28a745;">✅</span> Background service worker</p>
            <p style="margin: 8px 0;"><span style="color: #28a745;">✅</span> Backend connector</p>
            <p style="margin: 8px 0;"><span style="color: #28a745;">✅</span> Side panel HTML & JS</p>
            <p style="margin: 8px 0;"><span style="color: #ffc107;">⏳</span> React app webpack bundling</p>
            <p style="margin: 8px 0;"><span style="color: #ffc107;">⏳</span> Content scripts</p>
            <p style="margin: 8px 0;"><span style="color: #ffc107;">⏳</span> Platform configuration</p>
          </div>
        </div>
        
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
          Backend Status: ${
				this.backendConnected
					? '<span style="color: #28a745;">Connected</span>'
					: '<span style="color: #ffc107;">Disconnected</span>'
			}
        </div>
      </div>
    `

		this.appLoaded = true
	}

	handleMessage(message, sender, sendResponse) {
		console.log("[SidePanel] Received message:", message.type)

		switch (message.type) {
			case "BACKEND_STATUS_UPDATE":
				this.updateBackendStatus(message.status)
				break
			case "PAGE_UPDATED":
				// Handle page context updates
				if (window.clineApp) {
					window.clineApp.updatePageContext?.(message.data)
				}
				break
			default:
				console.log("[SidePanel] Unknown message type:", message.type)
		}
	}

	showLoading(text) {
		const loadingText = document.querySelector(".loading-text")
		if (loadingText) {
			loadingText.textContent = text
		}
	}

	updateLoadingText(text) {
		const loadingDetails = document.querySelector(".loading-details")
		if (loadingDetails) {
			loadingDetails.textContent = text
		}
	}

	hideLoading() {
		const loadingContainer = document.getElementById("loading-container")
		if (loadingContainer) {
			loadingContainer.style.display = "none"
		}
	}

	showError(title, details) {
		const clineRoot = document.getElementById("cline-root")
		clineRoot.innerHTML = `
      <div class="loading-container">
        <div style="color: #dc3545; font-size: 18px; margin-bottom: 10px;">${title}</div>
        <div style="color: #888; font-size: 14px; max-width: 400px;">${details}</div>
        <button onclick="location.reload()" style="
          margin-top: 20px; 
          padding: 8px 16px; 
          background: #007acc; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer;
        ">Retry</button>
      </div>
    `
	}

	toggleSetupInstructions() {
		const clineRoot = document.getElementById("cline-root")
		const setupTemplate = document.getElementById("setup-template")

		if (clineRoot.querySelector(".setup-container")) {
			// Hide setup and show main app
			if (this.appLoaded) {
				this.loadClineApp()
			} else {
				this.showPlaceholderApp()
			}
		} else {
			// Show setup instructions
			clineRoot.innerHTML = setupTemplate.innerHTML

			// Add back button
			const backButton = document.createElement("button")
			backButton.textContent = "← Back to App"
			backButton.style.cssText = `
        position: absolute;
        top: 40px;
        right: 20px;
        background: #007acc;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      `
			backButton.onclick = () => this.toggleSetupInstructions()
			clineRoot.appendChild(backButton)
		}
	}

	handleResize() {
		// Handle responsive design changes
		const width = window.innerWidth
		const body = document.body

		if (width < 400) {
			body.style.minWidth = "300px"
		} else {
			body.style.minWidth = "400px"
		}
	}
}

// Initialize side panel when DOM is loaded
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		window.sidePanelController = new SidePanelController()
	})
} else {
	window.sidePanelController = new SidePanelController()
}
