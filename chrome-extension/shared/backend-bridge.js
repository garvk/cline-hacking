// Backend Bridge - Utilities for communicating with Cline backend services
// Handles message transformation and response processing

import { logMessage, MessageTypes } from "./message-types.js"

export class BackendBridge {
	constructor() {
		this.isExtensionContext = typeof chrome !== "undefined" && chrome.runtime
		this.messageQueue = []
		this.pendingRequests = new Map()
		this.requestTimeout = 30000 // 30 seconds
	}

	/**
	 * Send a gRPC request to the backend through the extension messaging system
	 */
	async sendGrpcRequest(grpcRequest, timeout = this.requestTimeout) {
		if (!this.isExtensionContext) {
			throw new Error("Backend bridge can only be used in extension context")
		}

		const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

		logMessage("→ SEND", { type: MessageTypes.GRPC_REQUEST, data: grpcRequest }, "BackendBridge")

		return new Promise((resolve, reject) => {
			// Set up timeout
			const timeoutId = setTimeout(() => {
				this.pendingRequests.delete(requestId)
				reject(new Error(`Request timeout after ${timeout}ms`))
			}, timeout)

			// Store pending request
			this.pendingRequests.set(requestId, {
				resolve,
				reject,
				timeoutId,
				timestamp: Date.now(),
			})

			// Send message to background script
			chrome.runtime.sendMessage(
				{
					type: MessageTypes.GRPC_REQUEST,
					data: grpcRequest,
					requestId: requestId,
				},
				(response) => {
					const pending = this.pendingRequests.get(requestId)
					if (!pending) return // Already timed out

					clearTimeout(pending.timeoutId)
					this.pendingRequests.delete(requestId)

					if (chrome.runtime.lastError) {
						logMessage("← ERROR", chrome.runtime.lastError, "BackendBridge")
						reject(new Error(chrome.runtime.lastError.message))
						return
					}

					logMessage("← RECV", response, "BackendBridge")

					if (response?.success) {
						resolve(response.data)
					} else if (response?.fallbackMode) {
						// Backend unavailable - return fallback response
						reject(new BackendUnavailableError(response.statusMessage, response.setupInstructions))
					} else {
						reject(new Error(response?.error || "Unknown backend error"))
					}
				},
			)
		})
	}

	/**
	 * Send a webpage action request to content script
	 */
	async sendWebpageAction(action, params = {}) {
		if (!this.isExtensionContext) {
			throw new Error("Webpage actions can only be used in extension context")
		}

		logMessage("→ SEND", { type: MessageTypes.WEBPAGE_ACTION, action }, "WebpageAction")

		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(
				{
					type: MessageTypes.WEBPAGE_ACTION,
					data: {
						action: action,
						...params,
					},
				},
				(response) => {
					if (chrome.runtime.lastError) {
						reject(new Error(chrome.runtime.lastError.message))
						return
					}

					logMessage("← RECV", response, "WebpageAction")

					if (response?.success) {
						resolve(response.data || response)
					} else {
						reject(new Error(response?.error || "Webpage action failed"))
					}
				},
			)
		})
	}

	/**
	 * Transform Cline gRPC message format to Chrome extension format
	 */
	transformGrpcMessage(clineMessage) {
		try {
			// Parse the message if it's a string
			const message = typeof clineMessage === "string" ? JSON.parse(clineMessage) : clineMessage

			// Transform the message structure
			return {
				type: message.type || "grpc_request",
				grpc_request: {
					service: message.service || "cline.StateService",
					method: message.method || "subscribeToState",
					message: message.message || message.data || {},
					request_id: message.request_id || Date.now().toString(),
					is_streaming: message.is_streaming || false,
				},
			}
		} catch (error) {
			throw new Error(`Failed to transform gRPC message: ${error.message}`)
		}
	}

	/**
	 * Transform backend response to Cline format
	 */
	transformBackendResponse(backendResponse) {
		if (!backendResponse) {
			return null
		}

		// If it's already in the right format, return as-is
		if (backendResponse.type === "grpc_response") {
			return backendResponse
		}

		// Transform to expected format
		return {
			type: "grpc_response",
			grpc_response: {
				request_id: backendResponse.request_id || "unknown",
				message: backendResponse.data || backendResponse,
				is_streaming: backendResponse.is_streaming || false,
				error: backendResponse.error || null,
			},
		}
	}

	/**
	 * Create webpage interaction tools for AI
	 */
	createWebpageTools() {
		return {
			read_webpage: async () => {
				return await this.sendWebpageAction("READ_PAGE")
			},

			click_element: async (selector) => {
				return await this.sendWebpageAction("CLICK_ELEMENT", { selector })
			},

			fill_form_field: async (selector, value) => {
				return await this.sendWebpageAction("FILL_FORM_FIELD", { selector, value })
			},

			extract_data: async (selectors) => {
				return await this.sendWebpageAction("EXTRACT_DATA", { selectors })
			},

			scroll_to: async (target) => {
				return await this.sendWebpageAction("SCROLL_TO", { target })
			},

			navigate_page: async (direction) => {
				return await this.sendWebpageAction("NAVIGATE_PAGE", { direction })
			},

			highlight_elements: async (selectors) => {
				return await this.sendWebpageAction("HIGHLIGHT_ELEMENTS", { selectors })
			},

			clear_highlights: async () => {
				return await this.sendWebpageAction("CLEAR_HIGHLIGHTS")
			},

			get_page_structure: async () => {
				return await this.sendWebpageAction("GET_PAGE_STRUCTURE")
			},
		}
	}

	/**
	 * Check if backend is available
	 */
	async checkBackendStatus() {
		if (!this.isExtensionContext) {
			return { connected: false, error: "Not in extension context" }
		}

		try {
			const response = await new Promise((resolve) => {
				chrome.runtime.sendMessage(
					{
						type: MessageTypes.GET_BACKEND_STATUS,
					},
					resolve,
				)
			})

			return response?.status || { connected: false, error: "No status response" }
		} catch (error) {
			return { connected: false, error: error.message }
		}
	}

	/**
	 * Setup message listeners for streaming responses
	 */
	setupMessageListeners(onMessage) {
		if (!this.isExtensionContext) {
			throw new Error("Message listeners can only be set up in extension context")
		}

		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			if (message.type === MessageTypes.BACKEND_STATUS_UPDATE) {
				onMessage("backend_status", message.status)
			} else if (message.type === MessageTypes.PAGE_UPDATED) {
				onMessage("page_context", message.data)
			} else if (message.type === MessageTypes.GRPC_RESPONSE) {
				onMessage("grpc_response", message.data)
			}

			return true // Keep channel open
		})
	}

	/**
	 * Clean up pending requests
	 */
	cleanup() {
		for (const [requestId, pending] of this.pendingRequests) {
			clearTimeout(pending.timeoutId)
			pending.reject(new Error("Backend bridge is being cleaned up"))
		}
		this.pendingRequests.clear()
	}

	/**
	 * Get extension info
	 */
	getExtensionInfo() {
		if (!this.isExtensionContext) {
			return null
		}

		return {
			id: chrome.runtime.id,
			version: chrome.runtime.getManifest()?.version,
			platform: "chrome-extension",
		}
	}
}

// Custom error for backend unavailable scenarios
export class BackendUnavailableError extends Error {
	constructor(message, setupInstructions = []) {
		super(message)
		this.name = "BackendUnavailableError"
		this.setupInstructions = setupInstructions
		this.fallbackMode = true
	}
}

// File handling utilities for Chrome extension context
export class ExtensionFileHandler {
	constructor() {
		this.fileHandles = new Map()
		this.supportsFileSystemAccess = "showOpenFilePicker" in window
	}

	async openFile() {
		if (!this.supportsFileSystemAccess) {
			throw new Error("File System Access API not supported")
		}

		try {
			const [fileHandle] = await window.showOpenFilePicker({
				types: [
					{
						description: "Text and code files",
						accept: {
							"text/*": [
								".txt",
								".js",
								".ts",
								".jsx",
								".tsx",
								".html",
								".css",
								".json",
								".md",
								".py",
								".php",
								".go",
								".rs",
								".java",
								".cpp",
								".c",
								".h",
							],
						},
					},
				],
				multiple: false,
			})

			const file = await fileHandle.getFile()
			const content = await file.text()

			// Store handle for future saves
			this.fileHandles.set(file.name, fileHandle)

			return {
				success: true,
				name: file.name,
				content: content,
				size: file.size,
				lastModified: file.lastModified,
				type: file.type,
			}
		} catch (error) {
			if (error.name === "AbortError") {
				return { success: false, error: "File selection cancelled" }
			}
			return { success: false, error: error.message }
		}
	}

	async saveFile(fileName, content, suggestedName = null) {
		if (!this.supportsFileSystemAccess) {
			// Fallback: create download link
			return this.downloadFile(fileName, content)
		}

		try {
			let fileHandle = this.fileHandles.get(fileName)

			if (!fileHandle) {
				fileHandle = await window.showSaveFilePicker({
					suggestedName: suggestedName || fileName,
					types: [
						{
							description: "Text files",
							accept: {
								"text/*": [".txt", ".js", ".ts", ".html", ".css", ".json", ".md"],
							},
						},
					],
				})
				this.fileHandles.set(fileName, fileHandle)
			}

			const writable = await fileHandle.createWritable()
			await writable.write(content)
			await writable.close()

			return { success: true, fileName: fileName }
		} catch (error) {
			if (error.name === "AbortError") {
				return { success: false, error: "Save cancelled" }
			}
			return { success: false, error: error.message }
		}
	}

	downloadFile(fileName, content) {
		try {
			const blob = new Blob([content], { type: "text/plain" })
			const url = URL.createObjectURL(blob)

			const a = document.createElement("a")
			a.href = url
			a.download = fileName
			a.style.display = "none"

			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)

			URL.revokeObjectURL(url)

			return { success: true, fileName: fileName, method: "download" }
		} catch (error) {
			return { success: false, error: error.message }
		}
	}

	async openDirectory() {
		if (!("showDirectoryPicker" in window)) {
			throw new Error("Directory access not supported")
		}

		try {
			const dirHandle = await window.showDirectoryPicker()
			const files = []

			for await (const [name, handle] of dirHandle.entries()) {
				if (handle.kind === "file") {
					const file = await handle.getFile()
					files.push({
						name: name,
						size: file.size,
						lastModified: file.lastModified,
						type: file.type,
					})
				}
			}

			return { success: true, files: files, directoryName: dirHandle.name }
		} catch (error) {
			if (error.name === "AbortError") {
				return { success: false, error: "Directory selection cancelled" }
			}
			return { success: false, error: error.message }
		}
	}
}

// Singleton instances for global use
export const backendBridge = new BackendBridge()
export const fileHandler = new ExtensionFileHandler()

// Export utilities for extension components
export const extensionUtils = {
	isExtensionContext: () => typeof chrome !== "undefined" && chrome.runtime,
	getActiveTab: async () => {
		if (!extensionUtils.isExtensionContext()) return null
		const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
		return tabs[0] || null
	},
	getCurrentUrl: async () => {
		const tab = await extensionUtils.getActiveTab()
		return tab?.url || window.location.href
	},
	openOptionsPage: () => {
		if (extensionUtils.isExtensionContext()) {
			chrome.runtime.openOptionsPage()
		}
	},
}
