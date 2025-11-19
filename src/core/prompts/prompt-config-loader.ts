/**
 * Utility to load and convert prompt configurations from JSON to proto format
 */

import * as fs from "fs"
import * as path from "path"

// Proto enum mapping
export enum PromptOverrideType {
	PROMPT_OVERRIDE_TYPE_UNSPECIFIED = 0,
	PROMPT_OVERRIDE_TYPE_SIMPLE = 1,
	PROMPT_OVERRIDE_TYPE_COMPLEX = 2,
}

// Proto message types
export interface ComponentOverrides {
	agentRole?: string
	toolUse?: string
	todo?: string
	mcp?: string
	editingFiles?: string
	actVsPlan?: string
	taskProgress?: string
	capabilities?: string
	feedback?: string
	rules?: string
	systemInfo?: string
	objective?: string
	userInstructions?: string
}

export interface ToolPromptOverride {
	description?: string
	parametersInstruction?: string
	usageExample?: string
	examples?: string[]
	customParameters?: string
}

export interface ToolOverrides {
	[toolName: string]: ToolPromptOverride | undefined
}

export interface PromptConfiguration {
	overrideType: PromptOverrideType
	simplePromptText?: string
	componentOverrides?: ComponentOverrides
	enableToolOverrides?: boolean
	toolOverrides?: ToolOverrides
	preserveDefaultComponents?: boolean
	preserveDefaultTools?: boolean
	disabledComponents?: string[]
	disabledTools?: string[]
	metadata?: Record<string, string>
}

// JSON structure from prompt-configurations.json
interface JsonConfig {
	overrideType: string
	simplePromptText?: string
	componentOverrides?: Record<string, string>
	enableToolOverrides?: boolean
	toolOverrides?: Record<string, any>
	preserveDefaultComponents?: boolean
	preserveDefaultTools?: boolean
	disabledComponents?: string[]
	disabledTools?: string[]
	metadata?: Record<string, string>
}

interface JsonConfiguration {
	name: string
	description: string
	config: JsonConfig
}

interface JsonConfigFile {
	configurations: Record<string, JsonConfiguration>
	metadata: any
}

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Convert override type string to enum value
 */
function parseOverrideType(type: string): PromptOverrideType {
	switch (type) {
		case "PROMPT_OVERRIDE_TYPE_SIMPLE":
			return PromptOverrideType.PROMPT_OVERRIDE_TYPE_SIMPLE
		case "PROMPT_OVERRIDE_TYPE_COMPLEX":
			return PromptOverrideType.PROMPT_OVERRIDE_TYPE_COMPLEX
		case "PROMPT_OVERRIDE_TYPE_UNSPECIFIED":
		default:
			return PromptOverrideType.PROMPT_OVERRIDE_TYPE_UNSPECIFIED
	}
}

/**
 * Convert JSON component overrides to proto format
 */
function convertComponentOverrides(overrides?: Record<string, string>): ComponentOverrides | undefined {
	if (!overrides) {
		return undefined
	}

	const result: ComponentOverrides = {}

	// Map JSON keys to proto field names
	const keyMapping: Record<string, keyof ComponentOverrides> = {
		agentRole: "agentRole",
		toolUse: "toolUse",
		todo: "todo",
		mcp: "mcp",
		editingFiles: "editingFiles",
		actVsPlan: "actVsPlan",
		taskProgress: "taskProgress",
		capabilities: "capabilities",
		feedback: "feedback",
		rules: "rules",
		systemInfo: "systemInfo",
		objective: "objective",
		userInstructions: "userInstructions",
	}

	for (const [jsonKey, value] of Object.entries(overrides)) {
		const protoKey = keyMapping[jsonKey]
		if (protoKey) {
			result[protoKey] = value
		}
	}

	return Object.keys(result).length > 0 ? result : undefined
}

/**
 * Convert JSON tool overrides to proto format
 */
function convertToolOverrides(overrides?: Record<string, any>): ToolOverrides | undefined {
	if (!overrides) {
		return undefined
	}

	const result: ToolOverrides = {}

	for (const [toolName, toolConfig] of Object.entries(overrides)) {
		// Convert tool name from camelCase to snake_case for proto
		const snakeToolName = camelToSnake(toolName)

		const toolOverride: ToolPromptOverride = {}

		if (toolConfig.description) {
			toolOverride.description = toolConfig.description
		}
		if (toolConfig.parametersInstruction) {
			toolOverride.parametersInstruction = toolConfig.parametersInstruction
		}
		if (toolConfig.usageExample) {
			toolOverride.usageExample = toolConfig.usageExample
		}
		if (toolConfig.examples) {
			toolOverride.examples = toolConfig.examples
		}
		if (toolConfig.customParameters) {
			toolOverride.customParameters = toolConfig.customParameters
		}

		if (Object.keys(toolOverride).length > 0) {
			result[snakeToolName] = toolOverride
		}
	}

	return Object.keys(result).length > 0 ? result : undefined
}

/**
 * Convert JSON config to proto PromptConfiguration
 */
function convertJsonConfigToProto(jsonConfig: JsonConfig): PromptConfiguration {
	const config: PromptConfiguration = {
		overrideType: parseOverrideType(jsonConfig.overrideType),
	}

	// Simple mode
	if (jsonConfig.simplePromptText) {
		config.simplePromptText = jsonConfig.simplePromptText
	}

	// Complex mode
	if (jsonConfig.componentOverrides) {
		config.componentOverrides = convertComponentOverrides(jsonConfig.componentOverrides)
	}

	// Tool overrides
	if (jsonConfig.enableToolOverrides !== undefined) {
		config.enableToolOverrides = jsonConfig.enableToolOverrides
	}
	if (jsonConfig.toolOverrides) {
		config.toolOverrides = convertToolOverrides(jsonConfig.toolOverrides)
	}

	// Advanced options
	if (jsonConfig.preserveDefaultComponents !== undefined) {
		config.preserveDefaultComponents = jsonConfig.preserveDefaultComponents
	}
	if (jsonConfig.preserveDefaultTools !== undefined) {
		config.preserveDefaultTools = jsonConfig.preserveDefaultTools
	}
	if (jsonConfig.disabledComponents) {
		config.disabledComponents = jsonConfig.disabledComponents
	}
	if (jsonConfig.disabledTools) {
		config.disabledTools = jsonConfig.disabledTools
	}
	if (jsonConfig.metadata) {
		config.metadata = jsonConfig.metadata
	}

	return config
}

/**
 * Load prompt configuration by key from JSON file
 * @param configKey The configuration key (e.g., "design_assistant")
 * @param jsonPath Optional path to JSON file (defaults to webview-ui/public/prompt-configurations.json)
 * @returns PromptConfiguration in proto format, or undefined if not found
 */
export function loadPromptConfiguration(configKey: string, jsonPath?: string): PromptConfiguration | undefined {
	try {
		let filePath: string

		if (jsonPath) {
			filePath = jsonPath
		} else {
			// Try multiple possible paths (dev vs standalone)
			const possiblePaths = [
				// Standalone mode: dist-standalone/extension/webview-ui/build/
				path.join(__dirname, "extension/webview-ui/build/prompt-configurations.json"),
				// Development mode: from src/core/prompts/ to webview-ui/public/
				path.join(__dirname, "../../../webview-ui/public/prompt-configurations.json"),
				// Standalone alternative: relative to cline-core.js location
				path.join(__dirname, "webview-ui/build/prompt-configurations.json"),
			]

			// Find first existing path
			const existingPath = possiblePaths.find((p) => fs.existsSync(p))
			if (!existingPath) {
				console.warn(`[PromptConfigLoader] Config file not found in any location. Tried:`, possiblePaths)
				return undefined
			}
			filePath = existingPath
		}

		// Check if file exists
		if (!fs.existsSync(filePath)) {
			console.warn(`[PromptConfigLoader] Config file not found: ${filePath}`)
			return undefined
		}

		// Read and parse JSON
		const fileContent = fs.readFileSync(filePath, "utf-8")
		const jsonData: JsonConfigFile = JSON.parse(fileContent)

		// Find the configuration
		const jsonConfig = jsonData.configurations[configKey]
		if (!jsonConfig) {
			console.warn(`[PromptConfigLoader] Configuration key not found: ${configKey}`)
			return undefined
		}

		// Convert to proto format
		const protoConfig = convertJsonConfigToProto(jsonConfig.config)

		console.log(`[PromptConfigLoader] Loaded configuration: ${configKey}`)
		return protoConfig
	} catch (error) {
		console.error(`[PromptConfigLoader] Error loading configuration:`, error)
		return undefined
	}
}

/**
 * Get list of available configuration keys
 * @param jsonPath Optional path to JSON file
 * @returns Array of configuration keys
 */
export function getAvailableConfigurations(jsonPath?: string): string[] {
	try {
		const defaultPath = path.join(__dirname, "../../../webview-ui/public/prompt-configurations.json")
		const filePath = jsonPath || defaultPath

		if (!fs.existsSync(filePath)) {
			return []
		}

		const fileContent = fs.readFileSync(filePath, "utf-8")
		const jsonData: JsonConfigFile = JSON.parse(fileContent)

		return Object.keys(jsonData.configurations)
	} catch (error) {
		console.error(`[PromptConfigLoader] Error getting available configurations:`, error)
		return []
	}
}
