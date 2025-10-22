// Side Panel Controller - Manages the Cline React app in Chrome extension context
// Handles backend connection status and app initialization

class SidePanelController {
	constructor() {
		this.backendConnected = false
		this.appLoaded = false
		this.currentTaskId = null // Track current task to prevent reload loops
		this.taskLoadInProgress = false // Prevent concurrent task loads
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

			// CRITICAL FIX: Fetch and dispatch initial state BEFORE loading React app
			// This prevents the race condition where React mounts before state is available
			await this.fetchAndDispatchInitialState()

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

	/**
	 * Proactively fetch and dispatch initial state to prevent race condition.
	 * This mimics the WebSocket version's broadcastStateToClient behavior.
	 */
	async fetchAndDispatchInitialState() {
		console.log("[SidePanel] 🚀 Fetching initial state proactively (race condition fix)...")
		this.updateLoadingText("Loading initial state...")

		try {
			const response = await chrome.runtime.sendMessage({
				type: "GRPC_REQUEST",
				data: {
					type: "grpc_request",
					grpc_request: {
						service: "cline.StateService",
						method: "subscribeToState",
						message: {},
						request_id: "initial_state_preload",
						is_streaming: false,
					},
				},
			})

			if (chrome.runtime.lastError) {
				console.error("[SidePanel] Chrome runtime error:", chrome.runtime.lastError)
				throw new Error(chrome.runtime.lastError.message)
			}

			if (response?.success && response.data) {
				console.log("[SidePanel] ✅ Initial state fetched successfully!")
				console.log("[SidePanel] Response type:", response.data.type)
				console.log("[SidePanel] Has grpc_response:", !!response.data.grpc_response)

				// Log state details for debugging
				if (response.data.grpc_response?.message?.stateJson) {
					const statePreview = response.data.grpc_response.message.stateJson.slice(0, 200)
					console.log("[SidePanel] State preview:", statePreview + "...")
				}

				// Dispatch state to window BEFORE React app loads
				// This ensures state is available when ExtensionStateContext initializes
				window.dispatchEvent(
					new MessageEvent("message", {
						data: response.data,
					}),
				)

				console.log("[SidePanel] ✅ Initial state dispatched to window - React app will find it ready!")
			} else if (response?.fallbackMode) {
				console.warn("[SidePanel] ⚠️ Backend unavailable - fallback mode")
				// Continue anyway, React app will handle this
			} else {
				console.warn("[SidePanel] ⚠️ Unexpected response format:", response)
			}
		} catch (error) {
			console.error("[SidePanel] ❌ Failed to fetch initial state:", error)
			// Don't throw - let React app handle the missing state gracefully
		}
	}

	initializeMessageBridge() {
		console.log("[SidePanel] Setting up WebSocket connection for streaming...")

		const backendUrl = "ws://localhost:8001/ws"
		let ws = null
		let connected = false
		let reconnectAttempts = 0
		const maxReconnectAttempts = 5

		// Track pending WebSocket connection promise
		let connectionResolve = null
		this.webSocketReady = new Promise((resolve) => {
			connectionResolve = resolve
		})

		const connectWebSocket = () => {
			console.log("[SidePanel] 🔌 Connecting to WebSocket:", backendUrl)

			ws = new WebSocket(backendUrl)

			ws.onopen = () => {
				console.log("[SidePanel] ✅ WebSocket connected - streaming enabled!")
				connected = true
				reconnectAttempts = 0
				this.backendConnected = true
				this.updateBackendStatus({
					connected: true,
					message: "Backend connected - Streaming enabled",
				})

				// Resolve the connection promise so React app can load
				if (connectionResolve) {
					connectionResolve()
					connectionResolve = null
				}

				// Process any queued messages
				if (window.__messageQueue && window.__messageQueue.length > 0) {
					console.log(`[SidePanel] Processing ${window.__messageQueue.length} queued messages...`)
					const queue = window.__messageQueue
					window.__messageQueue = []
					queue.forEach((msg) => {
						console.log("[SidePanel] Processing queued message:", msg.slice(0, 100) + "...")
						ws.send(msg)
					})
				}
			}

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data)
					console.log("[SidePanel] 📨 Received WebSocket message type:", data.type || "unknown")

					// Dispatch to React app via window message event
					// Timestamps are now normalized by the backend, no conversion needed
					window.dispatchEvent(
						new MessageEvent("message", {
							data: data,
						}),
					)
				} catch (error) {
					console.error("[SidePanel] Error parsing WebSocket message:", error)
				}
			}

			ws.onclose = () => {
				console.log("[SidePanel] ❌ WebSocket disconnected")
				connected = false
				this.backendConnected = false

				// Reset the connection promise for next reconnection
				this.webSocketReady = new Promise((resolve) => {
					connectionResolve = resolve
				})

				this.updateBackendStatus({
					connected: false,
					message: "Backend disconnected - Reconnecting...",
				})

				// Attempt to reconnect
				if (reconnectAttempts < maxReconnectAttempts) {
					reconnectAttempts++
					const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000)
					console.log(
						`[SidePanel] 🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`,
					)
					setTimeout(connectWebSocket, delay)
				} else {
					console.error("[SidePanel] ❌ Max reconnection attempts reached")
					this.updateBackendStatus({
						connected: false,
						message: "Backend unavailable - Please check if services are running",
					})
				}
			}

			ws.onerror = (error) => {
				console.error("[SidePanel] ❌ WebSocket error:", error)
			}
		}

		// Create the global postMessage function that sends via WebSocket
		const webSocketPostMessage = (messageString) => {
			if (connected && ws && ws.readyState === WebSocket.OPEN) {
				console.log("[SidePanel] 📤 Sending via WebSocket:", messageString.slice(0, 200) + "...")
				ws.send(messageString)
			} else {
				console.log("[SidePanel] ⏳ WebSocket not ready, queueing message...")
				window.__messageQueue.push(messageString)
			}
		}

		// Replace the stub with WebSocket implementation
		window.chromeExtensionPostMessage = webSocketPostMessage

		// Start WebSocket connection
		connectWebSocket()

		console.log("[SidePanel] Message bridge initialized with WebSocket")
	}

	async loadClineApp() {
		console.log("[SidePanel] Loading Cline React app...")
		this.updateLoadingText("Waiting for backend connection...")

		try {
			// CRITICAL FIX: Wait for WebSocket connection before loading React app
			// This prevents the "postMessage not found" race condition
			console.log("[SidePanel] ⏳ Waiting for WebSocket to be ready...")
			await this.webSocketReady
			console.log("[SidePanel] ✅ WebSocket ready, proceeding with React app load")

			this.updateLoadingText("Loading dependencies...")

			// STEP 1: Load vendor bundle first (React, dependencies, protobuf)
			await this.loadScript("../shared/vendor.js", "Vendor bundle")
			console.log("[SidePanel] ✅ Vendor bundle loaded")

			// STEP 2: Long class detection no longer needed (backend normalizes timestamps)
			console.log("[SidePanel] ✅ Backend handles timestamp normalization")

			this.updateLoadingText("Loading Cline interface...")

			// STEP 3: Load the React app bundle
			await this.loadScript("cline-app.js", "Cline app")
			console.log("[SidePanel] ✅ React app loaded successfully")

			this.appLoaded = true
			this.hideLoading()
		} catch (error) {
			console.error("[SidePanel] Error loading React app:", error)
			this.showPlaceholderApp()
		}
	}

	/**
	 * Load a script dynamically and return a promise
	 */
	async loadScript(src, name) {
		return new Promise((resolve, reject) => {
			const script = document.createElement("script")
			script.src = src
			script.async = false // Load in order

			script.onload = () => {
				console.log(`[SidePanel] ✅ ${name} loaded from ${src}`)
				resolve()
			}

			script.onerror = (error) => {
				console.error(`[SidePanel] ❌ Failed to load ${name} from ${src}:`, error)
				reject(new Error(`Failed to load ${name}`))
			}

			document.head.appendChild(script)

			// Timeout fallback
			setTimeout(() => {
				if (!script.onload) {
					reject(new Error(`Timeout loading ${name}`))
				}
			}, 10000)
		})
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
			case "TASK_LOAD_REQUEST":
				// Handle task load requests with debouncing
				this.handleTaskLoadRequest(message.taskId)
				break
			default:
				console.log("[SidePanel] Unknown message type:", message.type)
		}
	}

	/**
	 * Handle task load requests with debouncing to prevent reload loops.
	 * This fixes the issue where opening a chat repeatedly reloads the same task.
	 */
	handleTaskLoadRequest(taskId) {
		// If this is the current task, skip reload
		if (this.currentTaskId === taskId && !this.taskLoadInProgress) {
			console.log(`[SidePanel] Task ${taskId} already loaded, skipping reload`)
			return
		}

		// If a task load is in progress, skip
		if (this.taskLoadInProgress) {
			console.log(`[SidePanel] Task load in progress, skipping request for ${taskId}`)
			return
		}

		console.log(`[SidePanel] Loading task ${taskId}...`)
		this.currentTaskId = taskId
		this.taskLoadInProgress = true

		// Reset flag after task load completes (with timeout)
		setTimeout(() => {
			this.taskLoadInProgress = false
			console.log(`[SidePanel] Task load completed for ${taskId}`)
		}, 2000)
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
