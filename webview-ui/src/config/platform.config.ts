import platformConfigs from "./platform-configs.json"

export interface PlatformConfig {
        type: PlatformType
        messageEncoding: MessageEncoding
        showNavbar: boolean
        postMessage: PostMessageFunction
        encodeMessage: MessageEncoder
        decodeMessage: MessageDecoder
        togglePlanActKeys: string
        supportsTerminalMentions: boolean
}

export enum PlatformType {
        VSCODE = 0,
        STANDALONE = 1,
}

function stringToPlatformType(name: string): PlatformType {
        const mapping: Record<string, PlatformType> = {
                vscode: PlatformType.VSCODE,
                standalone: PlatformType.STANDALONE,
        }
        if (name in mapping) {
                return mapping[name]
        }
        console.error("Unknown platform:", name)
        // Default to VSCode for unknown types
        return PlatformType.VSCODE
}

// Internal type for JSON structure (not exported)
type PlatformConfigJson = {
        messageEncoding: "none" | "json"
        showNavbar: boolean
        postMessageHandler: "vscode" | "standalone"
        togglePlanActKeys: string
        supportsTerminalMentions: boolean
}

type PlatformConfigs = Record<string, PlatformConfigJson>

// Global type declarations for postMessage and vscode API
declare global {
        interface Window {
                // This is the post message handler injected by JetBrains.
                // !! Do not change the name of the handler without updating it on
                // the JetBrains side as well. !!
                standalonePostMessage?: (message: string) => void
        }
        function acquireVsCodeApi(): any
}

// Initialize the vscode API if available
const vsCodeApi = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null

// Message queue for standalone messages sent before bridge is ready
const standaloneMessageQueue: any[] = []
let isProcessingQueue = false

// Function to process queued messages
function processStandaloneQueue() {
        if (isProcessingQueue || !window.standalonePostMessage) return
        
        isProcessingQueue = true
        console.log(`[Bridge] Processing ${standaloneMessageQueue.length} queued messages`)
        while (standaloneMessageQueue.length > 0) {
                const message = standaloneMessageQueue.shift()
                const json = JSON.stringify(message)
                console.log("[Bridge] Processing queued message: " + json.slice(0, 200))
                window.standalonePostMessage(json)
        }
        isProcessingQueue = false
}

// Set up global listener for when bridge becomes ready
if (typeof window !== 'undefined') {
        // Check periodically if bridge has become available
        const bridgeCheckInterval = setInterval(() => {
                if (window.standalonePostMessage && standaloneMessageQueue.length > 0) {
                        console.log("[Bridge] Detected standalonePostMessage is now available")
                        processStandaloneQueue()
                }
                // Stop checking after 10 seconds to avoid memory leak
                if ((window as any).__bridgeReady === true || (window as any).__bridgeReady === false) {
                        clearInterval(bridgeCheckInterval)
                }
        }, 50)
        
        // Clear interval after 10 seconds to prevent memory leak
        setTimeout(() => clearInterval(bridgeCheckInterval), 10000)
}

// Implementations for post message handling
const postMessageStrategies: Record<string, PostMessageFunction> = {
        vscode: (message: any) => {
                if (vsCodeApi) {
                        vsCodeApi.postMessage(message)
                } else {
                        console.log("postMessage fallback: ", message)
                }
        },
        standalone: (message: any) => {
                // Check if bridge is ready
                if (window.standalonePostMessage) {
                        const json = JSON.stringify(message)
                        console.log("Standalone postMessage: " + json.slice(0, 200))
                        window.standalonePostMessage(json)
                } else if ((window as any).__bridgeReady === 'pending' || (window as any).__bridgeReady === false) {
                        // Bridge is still loading or checking, queue the message
                        console.warn("[Bridge] standalonePostMessage not ready, queueing message...")
                        standaloneMessageQueue.push(message)
                        
                        // Try to process queue after a short delay
                        setTimeout(() => {
                                processStandaloneQueue()
                        }, 100)
                        
                        // Also set up a retry mechanism
                        let retries = 0
                        const retryInterval = setInterval(() => {
                                retries++
                                if (window.standalonePostMessage) {
                                        console.log(`[Bridge] standalonePostMessage now available after ${retries} retries`)
                                        clearInterval(retryInterval)
                                        processStandaloneQueue()
                                } else if (retries >= 50) {
                                        console.error("[Bridge] standalonePostMessage timeout after 5 seconds")
                                        clearInterval(retryInterval)
                                        // Still try to process any queued messages if bridge becomes available later
                                }
                        }, 100)
                } else {
                        // Bridge loading hasn't started or we're not in standalone mode
                        console.error("Standalone postMessage not found and bridge not loading.")
                }
        },
}

// Implementations for message encoding
const messageEncoders: Record<string, MessageEncoder> = {
        none: <T>(message: T, _encoder: (_: T) => unknown) => message,
        json: <T>(message: T, encoder: (_: T) => unknown) => encoder(message),
}

// Implementations for message decoding
const messageDecoders: Record<string, MessageDecoder> = {
        none: <T>(message: any, _decoder: (_: { [key: string]: any }) => T) => message,
        json: <T>(message: any, decoder: (_: { [key: string]: any }) => T) => decoder(message),
}

// Local declaration of the platform compile-time constant
declare const __PLATFORM__: string

// Get the specific platform config at compile time
const configs = platformConfigs as PlatformConfigs
const selectedConfig = configs[__PLATFORM__]
console.log("[PLATFORM_CONFIG] Build platform:", __PLATFORM__)

// Build the platform config with injected functions
// Callers should use this in the situations where the react component is not available.
export const PLATFORM_CONFIG: PlatformConfig = {
        type: stringToPlatformType(__PLATFORM__),
        messageEncoding: selectedConfig.messageEncoding,
        showNavbar: selectedConfig.showNavbar,
        postMessage: postMessageStrategies[selectedConfig.postMessageHandler],
        encodeMessage: messageEncoders[selectedConfig.messageEncoding],
        decodeMessage: messageDecoders[selectedConfig.messageEncoding],
        togglePlanActKeys: selectedConfig.togglePlanActKeys,
        supportsTerminalMentions: selectedConfig.supportsTerminalMentions,
}

type MessageEncoding = "none" | "json"

// Function types for platform-specific behaviors
type PostMessageFunction = (message: any) => void
type MessageEncoder = <T>(message: T, encoder: (_: T) => unknown) => any
type MessageDecoder = <T>(message: any, decoder: (_: { [key: string]: any }) => T) => T
