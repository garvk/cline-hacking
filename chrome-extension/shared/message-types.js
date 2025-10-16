// Message Types - Defines all message types used across the Chrome extension
// Ensures consistent communication between background, sidepanel, and content scripts

export const MessageTypes = {
	// Background Script Messages
	GRPC_REQUEST: "GRPC_REQUEST",
	GRPC_RESPONSE: "GRPC_RESPONSE",
	GET_BACKEND_STATUS: "GET_BACKEND_STATUS",
	BACKEND_STATUS_UPDATE: "BACKEND_STATUS_UPDATE",

	// Content Script Messages
	WEBPAGE_ACTION: "WEBPAGE_ACTION",
	READ_WEBPAGE: "READ_WEBPAGE",
	CONTENT_SCRIPT_READY: "CONTENT_SCRIPT_READY",

	// Page Context Messages
	PAGE_UPDATED: "PAGE_UPDATED",
	TAB_CHANGED: "TAB_CHANGED",

	// Error Handling
	ERROR: "ERROR",
	PING: "PING",

	// UI Messages
	SHOW_NOTIFICATION: "SHOW_NOTIFICATION",
	UPDATE_UI_STATE: "UPDATE_UI_STATE",
}

export const WebpageActions = {
	READ_PAGE: "READ_PAGE",
	CLICK_ELEMENT: "CLICK_ELEMENT",
	FILL_FORM_FIELD: "FILL_FORM_FIELD",
	EXTRACT_DATA: "EXTRACT_DATA",
	SCROLL_TO: "SCROLL_TO",
	NAVIGATE_PAGE: "NAVIGATE_PAGE",
	HIGHLIGHT_ELEMENTS: "HIGHLIGHT_ELEMENTS",
	CLEAR_HIGHLIGHTS: "CLEAR_HIGHLIGHTS",
	GET_PAGE_STRUCTURE: "GET_PAGE_STRUCTURE",
	SIMULATE_USER_ACTION: "SIMULATE_USER_ACTION",
}

export const BackendStatus = {
	CONNECTED: "connected",
	DISCONNECTED: "disconnected",
	ERROR: "error",
	CHECKING: "checking",
}

// Message factory functions for type safety
export const createGrpcRequest = (data, requestId = null) => ({
	type: MessageTypes.GRPC_REQUEST,
	data: data,
	requestId: requestId || Date.now().toString(),
	timestamp: Date.now(),
})

export const createWebpageAction = (action, params = {}) => ({
	type: MessageTypes.WEBPAGE_ACTION,
	data: {
		action: action,
		...params,
	},
	timestamp: Date.now(),
})

export const createBackendStatusUpdate = (status) => ({
	type: MessageTypes.BACKEND_STATUS_UPDATE,
	status: status,
	timestamp: Date.now(),
})

export const createPageUpdateMessage = (pageData) => ({
	type: MessageTypes.PAGE_UPDATED,
	data: pageData,
	timestamp: Date.now(),
})

export const createErrorMessage = (error, context = null) => ({
	type: MessageTypes.ERROR,
	error: {
		message: error.message || error,
		stack: error.stack,
		context: context,
	},
	timestamp: Date.now(),
})

// Response wrapper for consistent response format
export const createResponse = (success, data = null, error = null) => ({
	success: success,
	data: data,
	error: error,
	timestamp: Date.now(),
})

// Validation functions
export const isValidMessage = (message) => {
	return message && typeof message === "object" && message.type && Object.values(MessageTypes).includes(message.type)
}

export const isValidWebpageAction = (action) => {
	return Object.values(WebpageActions).includes(action)
}

// Message logging utility
export const logMessage = (direction, message, context = "") => {
	const timestamp = new Date().toISOString()
	const prefix = `[${timestamp}] ${direction}${context ? ` (${context})` : ""}`

	if (message.type === MessageTypes.GRPC_REQUEST) {
		console.log(`${prefix} gRPC:`, message.data?.type || "unknown")
	} else {
		console.log(`${prefix}:`, message.type)
	}

	// Log full message in debug mode
	if (window.__CLINE_DEBUG__) {
		console.log("Full message:", message)
	}
}
