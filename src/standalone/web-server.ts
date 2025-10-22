import cors from "cors"
import express from "express"
import http from "http"
import { WebSocketServer } from "ws"
import { Controller } from "../core/controller"

export interface WebServerOptions {
	port: number
	controller: Controller
}

export class WebServer {
	private app: express.Application
	private server: http.Server
	private wss: WebSocketServer
	private controller: Controller
	private port: number
	private sseClients: Set<any> = new Set()

	constructor(options: WebServerOptions) {
		this.controller = options.controller
		this.port = options.port
		this.app = express()
		this.server = http.createServer(this.app)
		this.wss = new WebSocketServer({ server: this.server })

		this.setupMiddleware()
		this.setupRoutes()
		this.setupWebSocket()
	}

	private setupMiddleware() {
		// Enable CORS for all origins (development mode)
		this.app.use(
			cors({
				origin: "*",
				methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
				allowedHeaders: ["Content-Type", "Authorization"],
			}),
		)

		// Parse JSON bodies
		this.app.use(express.json())

		// Add request logging
		this.app.use((req, res, next) => {
			console.log(`[WebServer] ${req.method} ${req.path}`)
			next()
		})

		// Serve static files from webview-ui build directory and node_modules
		const path = require("path")

		// Serve the built webview-ui files
		const webviewBuildPath = path.join(__dirname, "../../webview-ui/dist")
		this.app.use(express.static(webviewBuildPath))
		console.log(`[WebServer] Serving static files from: ${webviewBuildPath}`)

		// Serve codicons from node_modules
		const codiconsPath = path.join(__dirname, "../../webview-ui/node_modules/@vscode/codicons/dist")
		this.app.use("/node_modules/@vscode/codicons/dist", express.static(codiconsPath))
		console.log(`[WebServer] Serving codicons from: ${codiconsPath}`)

		// Serve all node_modules for any other dependencies
		const nodeModulesPath = path.join(__dirname, "../../webview-ui/node_modules")
		this.app.use("/node_modules", express.static(nodeModulesPath))
		console.log(`[WebServer] Serving node_modules from: ${nodeModulesPath}`)

		// Set proper MIME types for font files
		this.app.use((req, res, next) => {
			if (req.path.endsWith(".ttf")) {
				res.setHeader("Content-Type", "font/ttf")
			} else if (req.path.endsWith(".woff")) {
				res.setHeader("Content-Type", "font/woff")
			} else if (req.path.endsWith(".woff2")) {
				res.setHeader("Content-Type", "font/woff2")
			}
			next()
		})
	}

	private setupRoutes() {
		// Health check endpoint
		this.app.get("/health", (req, res) => {
			res.json({ status: "ok", timestamp: new Date().toISOString() })
		})

		// Message endpoint for HTTP fallback
		this.app.post("/message", async (req, res) => {
			try {
				console.log(`[WebServer] Received message:`, req.body)

				// Forward message to controller
				const response = await this.handleMessage(req.body)
				res.json({ success: true, response })
			} catch (error) {
				console.error("[WebServer] Error handling message:", error)
				res.status(500).json({
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				})
			}
		})

		// Server-Sent Events endpoint for real-time updates (Chrome extension support)
		this.app.get("/events", (req, res) => {
			console.log("[WebServer] SSE client connected")

			// Set SSE headers
			res.writeHead(200, {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			})

			// CRITICAL: Send immediate connection confirmation to prevent timeout
			res.write(": connected\n\n")
			res.flushHeaders()

			// Add client to set
			this.sseClients.add(res)

			// Send initial state with proper error handling
			;(async () => {
				try {
					const state = await this.controller.getStateToPostToWebview()
					// Check if connection is still open before sending
					if (!res.writableEnded) {
						this.sendSSEEvent(res, "state", state)
						console.log("[WebServer] Initial state sent via SSE")
					}
				} catch (error) {
					console.error("[WebServer] Error sending initial state via SSE:", error)
					// Don't close connection on error, just log it
				}
			})()

			// Send heartbeat every 30 seconds to keep connection alive
			const heartbeatInterval = setInterval(() => {
				try {
					if (!res.writableEnded) {
						res.write(": heartbeat\n\n")
					} else {
						clearInterval(heartbeatInterval)
						this.sseClients.delete(res)
					}
				} catch (error) {
					clearInterval(heartbeatInterval)
					this.sseClients.delete(res)
				}
			}, 30000)

			// Handle client disconnect
			req.on("close", () => {
				console.log("[WebServer] SSE client disconnected")
				clearInterval(heartbeatInterval)
				this.sseClients.delete(res)
				if (!res.writableEnded) {
					res.end()
				}
			})

			req.on("error", (error) => {
				console.error("[WebServer] SSE client error:", error)
				clearInterval(heartbeatInterval)
				this.sseClients.delete(res)
				if (!res.writableEnded) {
					res.end()
				}
			})
		})

		// Serve the standalone post message bridge script
		this.app.get("/standalone-bridge.js", (req, res) => {
			res.setHeader("Content-Type", "application/javascript")
			res.send(`
// Standalone PostMessage Bridge
(function() {
	let ws = null;
	let messageQueue = [];
	let connected = false;

	function connectWebSocket() {
		const wsUrl = 'ws://localhost:${this.port}/ws';
		console.log('[StandaloneBridge] Connecting to:', wsUrl);
		
		ws = new WebSocket(wsUrl);
		
		ws.onopen = function() {
			console.log('[StandaloneBridge] WebSocket connected');
			connected = true;
			
			// Send queued messages
			while (messageQueue.length > 0) {
				const message = messageQueue.shift();
				ws.send(message);
			}
		};
		
		ws.onmessage = function(event) {
			try {
				const data = JSON.parse(event.data);
				console.log('[StandaloneBridge] Received:', data);
				
				// Dispatch to window message system (not CustomEvent)
				window.dispatchEvent(new MessageEvent('message', { data: data }));
			} catch (error) {
				console.error('[StandaloneBridge] Error parsing message:', error, 'Raw data:', event.data);
			}
		};
		
		ws.onclose = function() {
			console.log('[StandaloneBridge] WebSocket disconnected, reconnecting...');
			connected = false;
			setTimeout(connectWebSocket, 1000);
		};
		
		ws.onerror = function(error) {
			console.error('[StandaloneBridge] WebSocket error:', error);
		};
	}

	// Implement the standalone postMessage function
	window.standalonePostMessage = function(messageString) {
		console.log('[StandaloneBridge] Sending message:', messageString.slice(0, 200) + '...');
		
		if (connected && ws && ws.readyState === WebSocket.OPEN) {
			ws.send(messageString);
		} else {
			console.log('[StandaloneBridge] Queuing message (not connected)');
			messageQueue.push(messageString);
			
			// Also try HTTP fallback
			fetch('/message', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: messageString
			}).catch(error => {
				console.error('[StandaloneBridge] HTTP fallback failed:', error);
			});
		}
	};

	// Start connection
	connectWebSocket();
})();
			`)
		})
	}

	/**
	 * Recursively normalize timestamps in an object for JSON serialization.
	 * Converts protobuf Long objects and plain {low, high, unsigned} objects to numbers.
	 * This fixes the "Invalid timestamp in partial message" error in Chrome extension.
	 */
	private normalizeTimestampsForSerialization(obj: any): any {
		if (obj === null || obj === undefined) {
			return obj
		}

		// Check if this looks like a Long object (has low/high properties)
		if (typeof obj === "object" && "low" in obj && "high" in obj) {
			// Convert Long-like object to number
			// For most timestamps, high will be 0 and low contains the actual value
			const low = obj.low >>> 0 // Convert to unsigned
			const high = obj.high >>> 0
			const value = high * 0x100000000 + low
			console.log(`[WebServer] 🔄 Normalized timestamp: {low:${obj.low}, high:${obj.high}} -> ${value}`)
			return value
		}

		// Check if this has a toString() method that looks like a Long (protobuf Long objects)
		if (typeof obj === "object" && typeof obj.toString === "function" && typeof obj.toNumber === "function") {
			const value = obj.toNumber()
			console.log(`[WebServer] 🔄 Normalized Long timestamp: ${obj.toString()} -> ${value}`)
			return value
		}

		// Handle arrays
		if (Array.isArray(obj)) {
			return obj.map((item) => this.normalizeTimestampsForSerialization(item))
		}

		// Handle plain objects
		if (typeof obj === "object") {
			const normalized: any = {}
			for (const key in obj) {
				if (Object.hasOwn(obj, key)) {
					normalized[key] = this.normalizeTimestampsForSerialization(obj[key])
				}
			}
			return normalized
		}

		// Return primitives as-is
		return obj
	}

	private setupWebSocket() {
		this.wss.on("connection", (ws) => {
			console.log("[WebServer] WebSocket client connected")

			// Create a broadcast function for streaming updates with JSON safety
			const postMessageToWebview = async (message: any): Promise<boolean | undefined> => {
				try {
					// CRITICAL FIX: Normalize timestamps before JSON serialization
					// This fixes the Chrome extension timestamp error
					const normalizedMessage = this.normalizeTimestampsForSerialization(message)
					const serializedMessage = JSON.stringify(normalizedMessage)
					ws.send(serializedMessage)
					return true
				} catch (error) {
					console.error("[WebServer] Serialization error:", error)
					return false
				}
			}

			// Send initial state when client connects
			this.broadcastStateToClient(ws)

			ws.on("message", async (data) => {
				try {
					const message = JSON.parse(data.toString())
					console.log("[WebServer] Received WebSocket message:", message)

					// Handle gRPC request with proper streaming support
					try {
						const { handleGrpcRequest } = await import("../core/controller/grpc-handler")
						if (message.type === "grpc_request" && message.grpc_request) {
							// Use the full gRPC handler that supports both streaming and non-streaming
							await handleGrpcRequest(this.controller, postMessageToWebview, message.grpc_request)
						} else {
							// Fallback for non-gRPC messages
							const response = await this.handleMessage(message)
							const serializedResponse = JSON.stringify(response)
							ws.send(serializedResponse)
							console.log("[WebServer] Non-gRPC response sent successfully")
						}
					} catch (error) {
						console.error("[WebServer] Error handling gRPC request:", error)

						// Send error response
						const errorResponse = JSON.stringify({
							type: "grpc_response",
							grpc_response: {
								request_id: message?.grpc_request?.request_id || "unknown",
								error: error instanceof Error ? error.message : "Request handling failed",
								is_streaming: false,
							},
						})
						ws.send(errorResponse)
						console.log("[WebServer] Error response sent")
					}
				} catch (error) {
					console.error("[WebServer] WebSocket message error:", error)
					const errorResponse = JSON.stringify({
						type: "grpc_response",
						grpc_response: {
							request_id: "unknown",
							error: error instanceof Error ? error.message : "Unknown error",
							is_streaming: false,
						},
					})
					ws.send(errorResponse)
					console.log("[WebServer] Error response sent")
				}
			})

			ws.on("close", () => {
				console.log("[WebServer] WebSocket client disconnected")
			})

			ws.on("error", (error) => {
				console.error("[WebServer] WebSocket error:", error)
			})
		})
	}

	/**
	 * Broadcast current state to all connected WebSocket clients
	 */
	private broadcastStateToAllClients = async () => {
		if (this.wss.clients.size === 0) {
			return
		}

		try {
			const state = await this.controller.getStateToPostToWebview()
			const stateMessage = {
				type: "grpc_response",
				grpc_response: {
					request_id: "state_broadcast",
					message: { stateJson: JSON.stringify(state) },
					is_streaming: false,
				},
			}

			// Normalize timestamps before sending
			const normalizedMessage = this.normalizeTimestampsForSerialization(stateMessage)

			let sentCount = 0
			this.wss.clients.forEach((client) => {
				if (client.readyState === 1) {
					// WebSocket.OPEN
					try {
						client.send(JSON.stringify(normalizedMessage))
						sentCount++
					} catch (error) {
						console.error("[WebServer] Error broadcasting to client:", error)
					}
				}
			})

			console.log(`[WebServer] State broadcast sent to ${sentCount} clients`)
		} catch (error) {
			console.error("[WebServer] Error broadcasting state:", error)
		}
	}

	/**
	 * Send current state to a specific WebSocket client
	 */
	private broadcastStateToClient = async (ws: any) => {
		try {
			const state = await this.controller.getStateToPostToWebview()
			const stateMessage = {
				type: "grpc_response",
				grpc_response: {
					request_id: "initial_state",
					message: { stateJson: JSON.stringify(state) },
					is_streaming: false,
				},
			}

			// Normalize timestamps before sending
			const normalizedMessage = this.normalizeTimestampsForSerialization(stateMessage)

			if (ws.readyState === 1) {
				// WebSocket.OPEN
				ws.send(JSON.stringify(normalizedMessage))
				console.log("[WebServer] Initial state sent to new client")
			}
		} catch (error) {
			console.error("[WebServer] Error sending initial state to client:", error)
		}
	}

	/**
	 * Set up streaming for partial message updates
	 * This enables real-time AI response streaming
	 */
	private setupPartialMessageStreaming = () => {
		console.log("[WebServer] Setting up partial message streaming...")

		// Hook into controller's postStateToWebview to intercept state updates
		const originalPostState = this.controller.postStateToWebview.bind(this.controller)

		this.controller.postStateToWebview = async (): Promise<void> => {
			// Always broadcast state to WebSocket clients when state updates occur
			console.log("[WebServer] State update intercepted, broadcasting to clients...")
			await this.broadcastStateToAllClients()

			// Call original method
			await originalPostState()
		}

		console.log("[WebServer] Partial message streaming setup complete")
	}

	/**
	 * Broadcast partial message to all WebSocket clients
	 */
	private broadcastPartialMessage = (partialMessage: any) => {
		if (this.wss.clients.size === 0) {
			return
		}

		const message = {
			type: "grpc_response",
			grpc_response: {
				request_id: "partial_message_stream",
				message: partialMessage,
				is_streaming: true,
			},
		}

		// Normalize timestamps before sending
		const normalizedMessage = this.normalizeTimestampsForSerialization(message)

		let sentCount = 0
		this.wss.clients.forEach((client) => {
			if (client.readyState === 1) {
				// WebSocket.OPEN
				try {
					client.send(JSON.stringify(normalizedMessage))
					sentCount++
				} catch (error) {
					console.error("[WebServer] Error broadcasting partial message:", error)
				}
			}
		})

		console.log(`[WebServer] Partial message broadcast sent to ${sentCount} clients`)
	}

	/**
	 * Send SSE event to a single client
	 */
	private sendSSEEvent = (res: any, eventType: string, data: any) => {
		try {
			// Check if connection is still open
			if (res.writableEnded) {
				this.sseClients.delete(res)
				return
			}
			const jsonData = JSON.stringify(data)
			res.write(`event: ${eventType}\n`)
			res.write(`data: ${jsonData}\n\n`)
		} catch (error) {
			console.error("[WebServer] Error sending SSE event:", error)
			this.sseClients.delete(res)
		}
	}

	/**
	 * Broadcast SSE event to all connected SSE clients
	 */
	private broadcastSSEEvent = (eventType: string, data: any) => {
		if (this.sseClients.size === 0) {
			return
		}

		let sentCount = 0
		this.sseClients.forEach((res) => {
			try {
				this.sendSSEEvent(res, eventType, data)
				sentCount++
			} catch (error) {
				console.error("[WebServer] Error broadcasting SSE event to client:", error)
				this.sseClients.delete(res)
			}
		})

		if (sentCount > 0) {
			console.log(`[WebServer] SSE event '${eventType}' sent to ${sentCount} clients`)
		}
	}

	/**
	 * Broadcast state updates to SSE clients (for Chrome extension real-time updates)
	 */
	private broadcastStateToSSEClients = async () => {
		try {
			const state = await this.controller.getStateToPostToWebview()
			this.broadcastSSEEvent("update", state)
		} catch (error) {
			console.error("[WebServer] Error broadcasting state to SSE clients:", error)
		}
	}

	private async handleMessage(message: any): Promise<any> {
		// Route gRPC requests to the Controller
		console.log("[WebServer] Processing message type:", message?.type)

		try {
			if (message.type === "grpc_request" && message.grpc_request) {
				const { service, method, message: requestData, request_id, is_streaming } = message.grpc_request
				console.log(`[WebServer] Routing gRPC: ${service}.${method}`)

				// Route to appropriate controller method
				const response = await this.routeGrpcRequest(service, method, requestData, is_streaming)

				return {
					type: "grpc_response",
					grpc_response: {
						request_id,
						message: response,
						is_streaming: false, // For now, handle streaming separately
					},
				}
			} else if (message.type === "grpc_request_cancel") {
				// Handle cancellation requests
				console.log("[WebServer] Handling gRPC cancellation:", message.grpc_request_cancel.request_id)
				return { type: "grpc_cancel_ack", request_id: message.grpc_request_cancel.request_id }
			} else {
				// Unknown message type, return error
				console.warn("[WebServer] Unknown message type:", message.type)
				return {
					type: "error",
					message: `Unknown message type: ${message.type}`,
				}
			}
		} catch (error) {
			console.error("[WebServer] Error processing message:", error)
			throw error
		}
	}

	private async routeGrpcRequest(service: string, method: string, requestData: any, isStreaming: boolean): Promise<any> {
		switch (service) {
			case "cline.StateService":
				return await this.handleStateService(method, requestData, isStreaming)
			case "cline.UiService":
				return await this.handleUiService(method, requestData, isStreaming)
			case "cline.TaskService":
				return await this.handleTaskService(method, requestData, isStreaming)
			case "cline.McpService":
				return await this.handleMcpService(method, requestData, isStreaming)
			case "cline.ModelsService":
				return await this.handleModelsService(method, requestData, isStreaming)
			case "cline.AccountService":
				return await this.handleAccountService(method, requestData, isStreaming)
			case "cline.FileService":
				return await this.handleFileService(method, requestData, isStreaming)
			default:
				throw new Error(`Unsupported service: ${service}`)
		}
	}

	private async handleStateService(method: string, requestData: any, isStreaming: boolean): Promise<any> {
		switch (method) {
			case "subscribeToState":
				console.log("[WebServer] Getting state from controller...")
				try {
					const state = await this.controller.getStateToPostToWebview()
					console.log("[WebServer] Controller state retrieved successfully:")
					console.log(`- Version: ${state.version}`)
					console.log(`- Messages count: ${state.clineMessages?.length || 0}`)
					console.log(`- Task history count: ${state.taskHistory?.length || 0}`)
					console.log(`- Welcome completed: ${state.welcomeViewCompleted}`)
					console.log(`- User info: ${!!state.userInfo}`)
					return { stateJson: JSON.stringify(state) }
				} catch (error) {
					console.error("[WebServer] Error getting state from controller:", error)
					throw error
				}
			case "getLatestState":
				console.log("[WebServer] Getting latest state from controller...")
				const latestState = await this.controller.getStateToPostToWebview()
				console.log("[WebServer] Latest state retrieved successfully")
				return { stateJson: JSON.stringify(latestState) }
			case "togglePlanActModeProto":
				const { mode, chatContent } = requestData
				const success = await this.controller.togglePlanActMode(mode, chatContent)
				return { value: success }
			case "getAvailableTerminalProfiles":
				console.log("[WebServer] Returning terminal profiles")
				return { profiles: [{ name: "default", type: "default" }] }
			case "setWelcomeViewCompleted":
				console.log("[WebServer] Setting welcome view completed:", requestData.value)
				try {
					// Update the welcome view completed state through the controller's state manager
					this.controller.stateManager.setGlobalState("welcomeViewCompleted", requestData.value)

					// Post updated state to ensure frontend receives the change
					await this.controller.postStateToWebview()

					console.log("[WebServer] Welcome view completed state updated successfully")
					return { success: true }
				} catch (error) {
					console.error("[WebServer] Error setting welcome view completed:", error)
					throw error
				}
			default:
				console.warn(`[WebServer] Unhandled StateService method: ${method}`)
				return {}
		}
	}

	private async handleUiService(method: string, requestData: any, isStreaming: boolean): Promise<any> {
		switch (method) {
			case "initializeWebview":
				// Initialize webview - just acknowledge
				await this.controller.postStateToWebview()
				return {}
			case "subscribeToPartialMessage":
				// CRITICAL: This is what enables real-time AI response streaming
				console.log(`[WebServer] Setting up partial message streaming subscription`)
				this.setupPartialMessageStreaming()
				return {}
			case "subscribeToMcpButtonClicked":
			case "subscribeToHistoryButtonClicked":
			case "subscribeToChatButtonClicked":
			case "subscribeToAccountButtonClicked":
			case "subscribeToSettingsButtonClicked":
			case "subscribeToRelinquishControl":
			case "subscribeToFocusChatInput":
			case "subscribeToDidBecomeVisible":
			case "subscribeToAddToInput":
				// UI subscription services - for now, return empty response
				// These would normally set up event listeners
				console.log(`[WebServer] UI subscription: ${method}`)
				return {}
			case "onDidShowAnnouncement":
				return { value: false }
			case "scrollToSettings":
				return { key: "scrollToSettings", value: requestData.value || "" }
			default:
				console.warn(`[WebServer] Unhandled UiService method: ${method}`)
				return {}
		}
	}

	private async handleTaskService(method: string, requestData: any, isStreaming: boolean): Promise<any> {
		switch (method) {
			case "newTask":
				const { text, images, files } = requestData
				console.log(`[WebServer] Creating new task: ${text?.slice(0, 100)}...`)
				const taskId = await this.controller.initTask(text, images, files)
				console.log(`[WebServer] Created task with ID: ${taskId}`)

				// CRITICAL: Broadcast updated state to all clients after task creation
				setTimeout(() => this.broadcastStateToAllClients(), 100)

				return { value: taskId }
			case "cancelTask":
				console.log(`[WebServer] Canceling current task`)
				await this.controller.cancelTask()

				// Broadcast state after cancellation
				setTimeout(() => this.broadcastStateToAllClients(), 100)

				return { success: true }
			case "clearTask":
				console.log(`[WebServer] Clearing current task`)
				await this.controller.clearTask()

				// Broadcast state after clearing
				setTimeout(() => this.broadcastStateToAllClients(), 100)

				return { success: true }
			case "exportTaskWithId":
				const { id: exportId } = requestData
				if (exportId) {
					await this.controller.exportTaskWithId(exportId)
					return { success: true }
				}
				return { success: false, error: "Task ID required" }
			case "deleteTaskFromState":
				const { taskId: deleteTaskId } = requestData
				if (deleteTaskId) {
					const updatedHistory = await this.controller.deleteTaskFromState(deleteTaskId)

					// Broadcast state after deletion
					setTimeout(() => this.broadcastStateToAllClients(), 100)

					return { taskHistory: updatedHistory }
				}
				return { success: false, error: "Task ID required" }
			default:
				console.warn(`[WebServer] Unhandled TaskService method: ${method}`)
				return {}
		}
	}

	private async handleMcpService(method: string, requestData: any, isStreaming: boolean): Promise<any> {
		switch (method) {
			case "subscribeToMcpServers":
				// Return current MCP servers
				return { mcpServers: [] } // TODO: Get actual MCP servers from controller
			case "subscribeToMcpMarketplaceCatalog":
				// Return marketplace catalog
				return { items: [] } // TODO: Get actual catalog
			default:
				console.warn(`[WebServer] Unhandled McpService method: ${method}`)
				return {}
		}
	}

	private async handleModelsService(method: string, requestData: any, isStreaming: boolean): Promise<any> {
		switch (method) {
			case "subscribeToOpenRouterModels":
				// Return cached OpenRouter models from controller
				const models = await this.controller.readOpenRouterModels()
				console.log(`[WebServer] Retrieved ${Object.keys(models || {}).length} OpenRouter models`)
				return { models: models || {} }
			case "refreshOpenRouterModels":
				// Refresh and return models - using the same method for now
				const refreshedModels = await this.controller.readOpenRouterModels()
				console.log(`[WebServer] Refreshed ${Object.keys(refreshedModels || {}).length} OpenRouter models`)
				return { models: refreshedModels || {} }
			case "subscribeToVercelAiGatewayModels":
				// Return cached Vercel AI Gateway models
				const vercelModels = await this.controller.readVercelAiGatewayModels()
				return { models: vercelModels || {} }
			case "getOllamaModels":
				console.log("[WebServer] Getting Ollama models for base URL:", requestData.value)
				try {
					// Import axios for HTTP requests
					const axios = await import("axios")

					const baseUrl = requestData.value || "http://localhost:11434"
					const modelsUrl = `${baseUrl}/api/tags`

					// Try to fetch models from Ollama API
					const response = await axios.default.get(modelsUrl, {
						timeout: 5000,
						headers: { "Content-Type": "application/json" },
					})

					if (response.data && response.data.models) {
						const modelNames = response.data.models.map((model: any) => model.name || model)
						console.log(`[WebServer] Retrieved ${modelNames.length} Ollama models`)
						return { values: modelNames }
					} else {
						console.warn("[WebServer] Invalid response from Ollama API")
						return { values: [] }
					}
				} catch (error) {
					console.warn("[WebServer] Failed to fetch Ollama models:", error)
					// Return common Ollama models as fallback
					const fallbackModels = [
						"llama3.2:latest",
						"llama3.1:latest",
						"llama3:latest",
						"codellama:latest",
						"mistral:latest",
						"qwen2.5:latest",
					]
					console.log("[WebServer] Returning fallback Ollama models")
					return { values: fallbackModels }
				}
			case "updateApiConfigurationProto":
				// Handle API configuration updates (provider selection, etc.)
				console.log(`[WebServer] Updating API configuration:`, JSON.stringify(requestData, null, 2))
				const { apiConfiguration } = requestData
				if (apiConfiguration) {
					try {
						// Log what we're about to save
						console.log(`[WebServer] API Key being saved: ${apiConfiguration.apiKey ? "[MASKED]" : "EMPTY"}`)
						console.log(
							`[WebServer] Provider being saved: ${apiConfiguration.planModeApiProvider || "NONE"}, ${apiConfiguration.actModeApiProvider || "NONE"}`,
						)

						// Import the function dynamically to avoid formatter issues
						const { updateApiConfigurationProto } = await import(
							"../core/controller/models/updateApiConfigurationProto"
						)
						const { UpdateApiConfigurationRequest } = await import("../shared/proto/cline/models")
						const { Empty } = await import("../shared/proto/cline/common")

						// Create the proper request object
						const request = UpdateApiConfigurationRequest.create({
							apiConfiguration: apiConfiguration,
						})

						// Update API configuration through the imported function - this returns Empty.create()
						const result = await updateApiConfigurationProto(this.controller, request)
						console.log(`[WebServer] Successfully updated API configuration via StateManager`)

						// Log what was actually saved by reading it back
						const savedConfig = this.controller.stateManager.getApiConfiguration()
						console.log(`[WebServer] Verification - Saved API Key: ${savedConfig.apiKey ? "[MASKED]" : "EMPTY"}`)
						console.log(
							`[WebServer] Verification - Saved Provider: plan=${savedConfig.planModeApiProvider || "NONE"}, act=${savedConfig.actModeApiProvider || "NONE"}`,
						)

						// CRITICAL: Post updated state to webview to ensure frontend gets the changes
						// This is necessary for the frontend validation logic to see the updated configuration
						await this.controller.postStateToWebview()
						console.log(`[WebServer] Posted updated state to webview after API config change`)

						// Return the proper Empty proto object
						return result
					} catch (error) {
						console.error(`[WebServer] Error updating API configuration:`, error)
						throw error
					}
				} else {
					console.warn(`[WebServer] No API configuration provided in request`)
					// Return proper Empty proto for consistency
					const { Empty } = await import("../shared/proto/cline/common")
					return Empty.create()
				}
			default:
				console.warn(`[WebServer] Unhandled ModelsService method: ${method}`)
				return {}
		}
	}

	private async handleAccountService(method: string, requestData: any, isStreaming: boolean): Promise<any> {
		switch (method) {
			case "subscribeToAuthStatusUpdate":
				// Get current auth status from controller state
				const currentState = await this.controller.getStateToPostToWebview()
				const isAuthenticated = !!currentState.userInfo
				return { isAuthenticated }
			case "accountLoginClicked":
				console.log("[WebServer] Account login clicked - redirecting to auth")
				try {
					// For now, return a success response - the actual auth flow would happen in a popup
					// The frontend should handle opening the auth URL in a new window
					// TODO: Implement actual login URL generation when auth service is integrated

					// Return empty response to indicate the action was processed
					return {}
				} catch (error) {
					console.error("[WebServer] Error handling login click:", error)
					throw error
				}
			case "handleAuthCallback":
				const { customToken, provider } = requestData
				if (customToken) {
					await this.controller.handleAuthCallback(customToken, provider)
					return { success: true }
				}
				return { success: false, error: "Custom token required" }
			case "handleSignOut":
				await this.controller.handleSignOut()
				return { success: true }
			case "handleOcaAuthCallback":
				const { code, state } = requestData
				if (code && state) {
					await this.controller.handleOcaAuthCallback(code, state)
					return { success: true }
				}
				return { success: false, error: "Code and state required" }
			case "handleOcaSignOut":
				await this.controller.handleOcaSignOut()
				return { success: true }
			default:
				console.warn(`[WebServer] Unhandled AccountService method: ${method}`)
				return {}
		}
	}

	private async handleFileService(method: string, requestData: any, isStreaming: boolean): Promise<any> {
		switch (method) {
			default:
				console.warn(`[WebServer] Unhandled FileService method: ${method}`)
				return {}
		}
	}

	public async start(): Promise<string> {
		return new Promise((resolve, reject) => {
			this.server.listen(this.port, () => {
				const address = `http://localhost:${this.port}`
				console.log(`[WebServer] HTTP server listening on ${address}`)
				console.log(`[WebServer] WebSocket server listening on ws://localhost:${this.port}/ws`)
				resolve(address)
			})

			this.server.on("error", (error) => {
				console.error("[WebServer] Server error:", error)
				reject(error)
			})
		})
	}

	public async stop(): Promise<void> {
		return new Promise((resolve) => {
			// Close WebSocket server
			this.wss.close(() => {
				console.log("[WebServer] WebSocket server closed")
			})

			// Close HTTP server
			this.server.close(() => {
				console.log("[WebServer] HTTP server closed")
				resolve()
			})
		})
	}
}
