// Backend Connector - Manages connection to existing Cline backend services
// Handles graceful fallback when backend is unavailable

export class BackendConnector {
	constructor() {
		this.backendUrl = "http://localhost:8080"
		this.connected = false
		this.connectionCheckInterval = null
		this.retryCount = 0
		this.maxRetries = 3
		this.lastConnectionCheck = 0
		this.connectionCheckThrottle = 5000 // 5 seconds
	}

	async checkConnection() {
		const now = Date.now()

		// Throttle connection checks to avoid overwhelming backend
		if (now - this.lastConnectionCheck < this.connectionCheckThrottle) {
			return {
				connected: this.connected,
				message: "Connection check throttled",
				cached: true,
			}
		}

		this.lastConnectionCheck = now

		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 3000)

			const response = await fetch(`${this.backendUrl}/health`, {
				signal: controller.signal,
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			})

			clearTimeout(timeoutId)
			this.connected = response.ok
			this.retryCount = 0

			console.log(`[BackendConnector] Health check: ${response.status} ${response.ok ? "OK" : "Failed"}`)

			return {
				connected: this.connected,
				status: response.status,
				message: this.connected ? "Backend services available" : "Backend not responding",
			}
		} catch (error) {
			this.connected = false
			this.retryCount++

			let message = "Backend services unavailable"
			if (error.name === "AbortError") {
				message = "Connection timeout - backend may not be running"
			} else if (error.code === "ECONNREFUSED") {
				message = "Connection refused - backend services not started"
			}

			console.warn(`[BackendConnector] Connection failed:`, error.message)

			return {
				connected: false,
				error: error.message,
				message: message,
				retryCount: this.retryCount,
				maxRetries: this.maxRetries,
			}
		}
	}

	async getConnectionStatus() {
		const status = await this.checkConnection()

		// Broadcast status to extension components
		try {
			// Note: In Manifest V3, service workers can't directly message side panel
			// Side panel will need to poll for status or use storage API
			await chrome.storage.local.set({
				"backend-status": {
					...status,
					timestamp: Date.now(),
				},
			})
		} catch (error) {
			console.warn("[BackendConnector] Could not store status:", error)
		}

		return status
	}

	startConnectionMonitoring() {
		if (this.connectionCheckInterval) {
			clearInterval(this.connectionCheckInterval)
		}

		// Check connection every 30 seconds
		this.connectionCheckInterval = setInterval(async () => {
			const status = await this.getConnectionStatus()
			console.log("[BackendConnector] Periodic status check:", status.connected ? "Connected" : "Disconnected")
		}, 30000)

		console.log("[BackendConnector] Connection monitoring started")
	}

	stopConnectionMonitoring() {
		if (this.connectionCheckInterval) {
			clearInterval(this.connectionCheckInterval)
			this.connectionCheckInterval = null
			console.log("[BackendConnector] Connection monitoring stopped")
		}
	}

	async handleRequest(request) {
		const status = await this.checkConnection()

		if (!status.connected) {
			return {
				success: false,
				error: "Backend services unavailable",
				fallbackMode: true,
				statusMessage: status.message,
				setupInstructions: [
					"To enable full AI functionality, start the Cline backend services:",
					"",
					"1. Open Terminal 1:",
					"   cd dist-standalone/extension",
					"   ./cli/bin/cline-host --port 26041 --verbose",
					"",
					"2. Open Terminal 2:",
					"   cd dist-standalone",
					"   node cline-core.js --port 8080 --host-bridge-port 26041",
					"",
					"3. Refresh this extension or reload the page",
					"",
					"Note: Webpage interaction works without backend services.",
				],
			}
		}

		// Forward request to backend
		try {
			console.log("[BackendConnector] Forwarding request to backend:", request?.type || "unknown")

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

			const response = await fetch(`${this.backendUrl}/message`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify(request),
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const data = await response.json()
			console.log("[BackendConnector] Backend response received:", data?.success ? "Success" : "Failed")

			// CRITICAL FIX: Unwrap the response field from web-server's HTTP response
			// web-server returns: { success: true, response: gRPCData }
			// We need to extract just the gRPCData to match WebSocket behavior
			return {
				success: true,
				data: data.response || data, // Unwrap 'response' field, fallback to data if not present
			}
		} catch (error) {
			console.error("[BackendConnector] Request failed:", error)

			// Update connection status on failure
			this.connected = false

			return {
				success: false,
				error: error.message,
				fallbackMode: true,
				statusMessage: "Request failed - backend may be overloaded or disconnected",
			}
		}
	}

	// Handle streaming responses (for future AI response streaming)
	async handleStreamingRequest(request, onChunk) {
		const status = await this.checkConnection()

		if (!status.connected) {
			return {
				success: false,
				error: "Backend services unavailable",
				fallbackMode: true,
			}
		}

		try {
			console.log("[BackendConnector] Starting streaming request")

			const response = await fetch(`${this.backendUrl}/message`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify(request),
			})

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const reader = response.body?.getReader()
			if (!reader) {
				throw new Error("No response body reader available")
			}

			const decoder = new TextDecoder()

			while (true) {
				const { done, value } = await reader.read()

				if (done) break

				const chunk = decoder.decode(value)
				if (onChunk) {
					onChunk(chunk)
				}
			}

			return { success: true }
		} catch (error) {
			console.error("[BackendConnector] Streaming request failed:", error)
			this.connected = false

			return {
				success: false,
				error: error.message,
				fallbackMode: true,
			}
		}
	}

	// Get setup instructions for users
	getSetupInstructions() {
		return {
			title: "Enable Full Cline Functionality",
			description: "To use AI chat and advanced features, start the Cline backend services:",
			steps: [
				{
					title: "Terminal 1: Start Hostbridge Service",
					command: "cd dist-standalone/extension && ./cli/bin/cline-host --port 26041 --verbose",
					description: "Handles file system and terminal operations",
				},
				{
					title: "Terminal 2: Start Cline Core Service",
					command: "cd dist-standalone && node cline-core.js --port 8080 --host-bridge-port 26041",
					description: "Provides AI chat and gRPC services",
				},
				{
					title: "Verify Connection",
					command: "curl http://localhost:8080/health",
					description: 'Should return {"status":"ok"} when services are running',
				},
			],
			fallbackFeatures: [
				"✅ Webpage interaction (reading, clicking, form filling)",
				"✅ Browser-based file operations",
				"✅ Basic text editing and note-taking",
				"❌ AI chat (requires backend)",
				"❌ Advanced file operations",
				"❌ Terminal access",
			],
		}
	}

	// Cleanup method
	destroy() {
		this.stopConnectionMonitoring()
	}
}
