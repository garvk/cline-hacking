// Side Panel Controller - Message bridge for Chrome extension
// The React app is now loaded directly from webview-ui/build via sidepanel.html
// This file only handles the message bridge and backend connection

class SidePanelController {
	constructor() {
		this.backendConnected = false
		this.connectionResolve = null
		this.webSocketReady = new Promise((resolve) => {
			this.connectionResolve = resolve
		})
		this.initialize()
	}

	async initialize() {
		console.log("[SidePanel] Initializing message bridge...")

		try {
			// Initialize WebSocket connection for backend communication
			// All gRPC requests (including subscriptions) will go through WebSocket
			this.initializeMessageBridge()

			// Wait for WebSocket to be ready before allowing React to mount
			await this.webSocketReady
			console.log("[SidePanel] ✅ WebSocket ready - React app can now mount and create subscriptions")

			console.log("[SidePanel] ✅ Initialization complete - React app will mount automatically")
		} catch (error) {
			console.error("[SidePanel] Initialization failed:", error)
		}
	}

	initializeMessageBridge() {
		console.log("[SidePanel] Setting up WebSocket connection...")

		const backendUrl = "ws://localhost:8080/ws"
		let ws = null
		let connected = false
		let reconnectAttempts = 0
		const maxReconnectAttempts = 5

		const connectWebSocket = () => {
			console.log("[SidePanel] 🔌 Connecting to WebSocket:", backendUrl)

			ws = new WebSocket(backendUrl)

			ws.onopen = () => {
				console.log("[SidePanel] ✅ WebSocket connected - streaming enabled!")
				connected = true
				reconnectAttempts = 0
				this.backendConnected = true

				// Resolve connection promise
				if (this.connectionResolve) {
					this.connectionResolve()
					this.connectionResolve = null
				}

				// Process any queued messages
				if (window.__messageQueue && window.__messageQueue.length > 0) {
					console.log(`[SidePanel] Processing ${window.__messageQueue.length} queued messages...`)
					const queue = window.__messageQueue
					window.__messageQueue = []
					for (const msg of queue) {
						ws.send(msg)
					}
				}
			}

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data)
					console.log("[SidePanel] 📨 Received message type:", data.type || "unknown")

					// Dispatch to React app via window message event
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

				// Reset connection promise
				this.webSocketReady = new Promise((resolve) => {
					this.connectionResolve = resolve
				})

				// Attempt reconnection
				if (reconnectAttempts < maxReconnectAttempts) {
					reconnectAttempts++
					const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000)
					console.log(
						`[SidePanel] 🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`,
					)
					setTimeout(connectWebSocket, delay)
				} else {
					console.error("[SidePanel] ❌ Max reconnection attempts reached")
				}
			}

			ws.onerror = (error) => {
				console.error("[SidePanel] ❌ WebSocket error:", error)
			}
		}

		// Create the global postMessage function for React app
		const webSocketPostMessage = (messageString) => {
			if (connected && ws && ws.readyState === WebSocket.OPEN) {
				ws.send(messageString)
			} else {
				console.log("[SidePanel] ⏳ WebSocket not ready, queueing message...")
				window.__messageQueue.push(messageString)
			}
		}

		// Replace the stub from platform-init.js with real WebSocket implementation
		window.chromeExtensionPostMessage = webSocketPostMessage

		// Start WebSocket connection
		connectWebSocket()

		console.log("[SidePanel] Message bridge initialized with WebSocket")
	}
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		window.sidePanelController = new SidePanelController()
	})
} else {
	window.sidePanelController = new SidePanelController()
}
