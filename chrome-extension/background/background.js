// Chrome Extension Background Service Worker
// Handles message routing between side panel, content scripts, and backend

import { BackendConnector } from "./backend-connector.js"

class ExtensionBackground {
	constructor() {
		this.backendConnector = new BackendConnector()
		this.setupEventListeners()
		this.initializeExtension()
	}

	setupEventListeners() {
		// Handle extension installation
		chrome.runtime.onInstalled.addListener(() => {
			console.log("[Background] Extension installed")
			this.setupSidePanel()
		})

		// Handle extension icon clicks
		chrome.action.onClicked.addListener((tab) => {
			console.log("[Background] Extension icon clicked")
			chrome.sidePanel.open({ tabId: tab.id })
		})

		// Handle messages from side panel and content scripts
		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			this.handleMessage(request, sender, sendResponse)
			return true // Keep async channel open
		})

		// Handle tab updates for page context
		chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
			if (changeInfo.status === "complete") {
				this.broadcastPageUpdate(tab)
			}
		})
	}

	setupSidePanel() {
		chrome.sidePanel.setOptions({
			tabId: undefined,
			path: "sidepanel/sidepanel.html",
			enabled: true,
		})
	}

	async initializeExtension() {
		console.log("[Background] Initializing extension...")

		// Start backend connection monitoring
		this.backendConnector.startConnectionMonitoring()

		// Check initial backend status
		const status = await this.backendConnector.getConnectionStatus()
		console.log("[Background] Initial backend status:", status)

		// Note: WebSocket streaming is handled by the side panel directly
		// Background script only monitors connection health via HTTP
	}

	async handleMessage(request, sender, sendResponse) {
		try {
			console.log("[Background] Received message:", request.type, "from:", sender.tab?.url || "extension")

			switch (request.type) {
				case "GRPC_REQUEST":
					await this.handleGrpcRequest(request, sendResponse)
					break

				case "WEBPAGE_ACTION":
					await this.handleWebpageAction(request, sender, sendResponse)
					break

				case "READ_WEBPAGE":
					await this.handleReadWebpage(request, sender, sendResponse)
					break

				case "GET_BACKEND_STATUS":
					const status = await this.backendConnector.getConnectionStatus()
					sendResponse({ success: true, status })
					break

				case "PING":
					sendResponse({ success: true, message: "pong" })
					break

				default:
					console.warn("[Background] Unknown message type:", request.type)
					sendResponse({ success: false, error: "Unknown message type" })
			}
		} catch (error) {
			console.error("[Background] Error handling message:", error)
			sendResponse({ success: false, error: error.message })
		}
	}

	async handleGrpcRequest(request, sendResponse) {
		console.log("[Background] Forwarding gRPC request to backend")

		try {
			const response = await this.backendConnector.handleRequest(request.data)

			if (response.fallbackMode) {
				// Backend unavailable - return fallback response
				sendResponse({
					success: false,
					fallbackMode: true,
					statusMessage: response.statusMessage,
					setupInstructions: response.setupInstructions,
				})
			} else {
				// Backend available - return data
				sendResponse({
					success: true,
					data: response.data,
				})
			}
		} catch (error) {
			console.error("[Background] Error handling gRPC request:", error)
			sendResponse({
				success: false,
				error: error.message,
				fallbackMode: true,
			})
		}
	}

	async handleWebpageAction(request, sender, sendResponse) {
		if (!sender.tab) {
			sendResponse({ success: false, error: "No active tab" })
			return
		}

		try {
			// Forward action to content script
			const response = await chrome.tabs.sendMessage(sender.tab.id, request.data)
			sendResponse(response)
		} catch (error) {
			console.error("[Background] Error sending webpage action:", error)
			sendResponse({ success: false, error: error.message })
		}
	}

	async handleReadWebpage(request, sender, sendResponse) {
		if (!sender.tab) {
			sendResponse({ success: false, error: "No active tab" })
			return
		}

		try {
			// Request page data from content script
			const response = await chrome.tabs.sendMessage(sender.tab.id, {
				action: "READ_PAGE",
			})
			sendResponse(response)
		} catch (error) {
			console.error("[Background] Error reading webpage:", error)
			sendResponse({ success: false, error: error.message })
		}
	}

	async broadcastPageUpdate(tab) {
		// Broadcast page changes to side panel
		try {
			const message = {
				type: "PAGE_UPDATED",
				data: {
					title: tab.title,
					url: tab.url,
					tabId: tab.id,
				},
			}

			// Note: In Manifest V3, we can't directly message side panel
			// Side panel will need to poll for active tab changes
			console.log("[Background] Page updated:", tab.url)
		} catch (error) {
			console.error("[Background] Error broadcasting page update:", error)
		}
	}
}

// Initialize background service
new ExtensionBackground()
