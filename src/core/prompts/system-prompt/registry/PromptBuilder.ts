import type { PromptConfiguration, ToolPromptOverride } from "@/generated/nice-grpc/cline/sdk/prompts"
import type { ClineDefaultTool } from "@/shared/tools"
import { getModelFamily } from "../"
import { ClineToolSet } from "../registry/ClineToolSet"
import type { ClineToolSpec } from "../spec"
import { STANDARD_PLACEHOLDERS } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { ComponentRegistry, PromptVariant, SystemPromptContext } from "../types"

// Pre-defined mapping of standard placeholders to avoid runtime object creation
const STANDARD_PLACEHOLDER_KEYS = Object.values(STANDARD_PLACEHOLDERS)

export class PromptBuilder {
	private templateEngine: TemplateEngine

	constructor(
		private variant: PromptVariant,
		private context: SystemPromptContext,
		private components: ComponentRegistry,
	) {
		this.templateEngine = new TemplateEngine()
	}

	async build(): Promise<string> {
		const componentSections = await this.buildComponents()
		const placeholderValues = this.preparePlaceholders(componentSections)
		const prompt = this.templateEngine.resolve(this.variant.baseTemplate, this.context, placeholderValues)
		return this.postProcess(prompt)
	}

	private async buildComponents(): Promise<Record<string, string>> {
		const sections: Record<string, string> = {}
		const { componentOrder } = this.variant
		const promptConfig = this.context.promptConfiguration

		// Process components sequentially to maintain order
		for (const componentId of componentOrder) {
			// Skip if disabled
			if (promptConfig?.disabledComponents?.includes(componentId)) {
				console.log(`Skipping disabled component: ${componentId}`)
				continue
			}

			// Check for component override (COMPLEX mode)
			const override = this.getComponentOverride(componentId, promptConfig)
			if (override) {
				console.log(`Using override for component: ${componentId}`)
				sections[componentId] = override
				continue
			}

			// Use default component function
			const componentFn = this.components[componentId]
			if (!componentFn) {
				console.warn(`Warning: Component '${componentId}' not found`)
				continue
			}

			try {
				const result = await componentFn(this.variant, this.context)
				if (result?.trim()) {
					sections[componentId] = result
				}
			} catch (error) {
				console.warn(`Warning: Failed to build component '${componentId}':`, error)
			}
		}

		return sections
	}

	/**
	 * Get component override from promptConfiguration
	 * Maps component IDs (snake_case) to proto field names (camelCase)
	 */
	private getComponentOverride(componentId: string, promptConfig?: PromptConfiguration): string | undefined {
		if (!promptConfig?.componentOverrides) {
			return undefined
		}

		// Map component IDs to override fields
		const overrideMap: Record<string, string | undefined> = {
			agent_role: promptConfig.componentOverrides.agentRole,
			tool_use: promptConfig.componentOverrides.toolUse,
			todo: promptConfig.componentOverrides.todo,
			mcp: promptConfig.componentOverrides.mcp,
			editing_files: promptConfig.componentOverrides.editingFiles,
			act_vs_plan: promptConfig.componentOverrides.actVsPlan,
			task_progress: promptConfig.componentOverrides.taskProgress,
			capabilities: promptConfig.componentOverrides.capabilities,
			feedback: promptConfig.componentOverrides.feedback,
			rules: promptConfig.componentOverrides.rules,
			system_info: promptConfig.componentOverrides.systemInfo,
			objective: promptConfig.componentOverrides.objective,
			user_instructions: promptConfig.componentOverrides.userInstructions,
		}

		return overrideMap[componentId]
	}

	private preparePlaceholders(componentSections: Record<string, string>): Record<string, unknown> {
		// Create base placeholders object with optimal capacity
		const placeholders: Record<string, unknown> = {}

		// Add variant placeholders
		Object.assign(placeholders, this.variant.placeholders)

		// Add standard system placeholders
		placeholders[STANDARD_PLACEHOLDERS.CWD] = this.context.cwd || process.cwd()
		placeholders[STANDARD_PLACEHOLDERS.SUPPORTS_BROWSER] = this.context.supportsBrowserUse || false
		placeholders[STANDARD_PLACEHOLDERS.MODEL_FAMILY] = getModelFamily(this.context.providerInfo)
		placeholders[STANDARD_PLACEHOLDERS.CURRENT_DATE] = new Date().toISOString().split("T")[0]

		// Add all component sections
		Object.assign(placeholders, componentSections)

		// Map component sections to standard placeholders in a single loop
		for (const key of STANDARD_PLACEHOLDER_KEYS) {
			if (!placeholders[key]) {
				placeholders[key] = componentSections[key] || ""
			}
		}

		// Add runtime placeholders with highest priority
		const runtimePlaceholders = (this.context as any).runtimePlaceholders
		if (runtimePlaceholders) {
			Object.assign(placeholders, runtimePlaceholders)
		}
		return placeholders
	}

	private postProcess(prompt: string): string {
		if (!prompt) {
			return ""
		}

		// Combine multiple regex operations for better performance
		return prompt
			.replace(/\n\s*\n\s*\n/g, "\n\n") // Remove multiple consecutive empty lines
			.trim() // Remove leading/trailing whitespace
			.replace(/====+\s*$/, "") // Remove trailing ==== after trim
			.replace(/\n====+\s*\n+\s*====+\n/g, "\n====\n") // Remove empty sections between separators
			.replace(/====+\n(?!\n)([^\n])/g, (match, nextChar, offset, string) => {
				// Add extra newline after ====+ if not already followed by a newline
				// Exception: preserve single newlines when ====+ appears to be part of diff-like content
				// Look for patterns like "SEARCH\n=======\n" or ";\n=======\n" (diff markers)
				const beforeContext = string.substring(Math.max(0, offset - 50), offset)
				const afterContext = string.substring(offset, Math.min(string.length, offset + 50))
				const isDiffLike = /SEARCH|REPLACE|\+\+\+\+\+\+\+|-------/.test(beforeContext + afterContext)
				return isDiffLike ? match : match.replace(/\n/, "\n\n")
			})
			.replace(/([^\n])\n(?!\n)====+/g, (match, prevChar, offset, string) => {
				// Add extra newline before ====+ if not already preceded by a newline
				// Exception: preserve single newlines when ====+ appears to be part of diff-like content
				const beforeContext = string.substring(Math.max(0, offset - 50), offset)
				const afterContext = string.substring(offset, Math.min(string.length, offset + 50))
				const isDiffLike = /SEARCH|REPLACE|\+\+\+\+\+\+\+|-------/.test(beforeContext + afterContext)
				return isDiffLike ? match : prevChar + "\n\n" + match.substring(1).replace(/\n/, "")
			})
	}

	getBuildMetadata(): {
		variantId: string
		version: number
		componentsUsed: string[]
		placeholdersResolved: string[]
	} {
		return {
			variantId: this.variant.id,
			version: this.variant.version,
			componentsUsed: [...this.variant.componentOrder],
			placeholdersResolved: this.templateEngine.extractPlaceholders(this.variant.baseTemplate),
		}
	}

	public static async getToolsPrompts(variant: PromptVariant, context: SystemPromptContext) {
		let resolvedTools: ReturnType<typeof ClineToolSet.getTools> = []

		// If the variant explicitly lists tools, resolve each by id with fallback to GENERIC
		if (variant?.tools?.length) {
			const requestedIds = [...variant.tools]
			resolvedTools = ClineToolSet.getToolsForVariantWithFallback(variant.family, requestedIds)

			// Preserve requested order
			resolvedTools = requestedIds
				.map((id) => resolvedTools.find((t) => t.config.id === id))
				.filter((t): t is NonNullable<typeof t> => Boolean(t))
		} else {
			// Otherwise, use all tools registered for the variant, or generic if none
			resolvedTools = ClineToolSet.getTools(variant.family)
			// Sort by id for stable ordering
			resolvedTools = resolvedTools.sort((a, b) => a.config.id.localeCompare(b.config.id))
		}

		const promptConfig = context.promptConfiguration

		// Filter by context requirements and disabled tools
		const enabledTools = resolvedTools.filter((tool) => {
			// Skip if disabled in promptConfiguration
			if (promptConfig?.disabledTools?.includes(tool.config.id)) {
				console.log(`Skipping disabled tool: ${tool.config.id}`)
				return false
			}
			// Check context requirements
			return !tool.config.contextRequirements || tool.config.contextRequirements(context)
		})

		const ids = enabledTools.map((tool) => tool.config.id)
		return Promise.all(enabledTools.map((tool) => PromptBuilder.tool(tool.config, ids, context)))
	}

	public static tool(config: ClineToolSpec, registry: ClineDefaultTool[], context: SystemPromptContext): string {
		const promptConfig = context.promptConfiguration

		// Check for tool override
		const toolOverride = PromptBuilder.getToolOverride(config.id, promptConfig)
		if (toolOverride) {
			console.log(`Using override for tool: ${config.id}`)
			return PromptBuilder.buildToolFromOverride(config.id, toolOverride)
		}

		// Skip tools without parameters or description - those are placeholder tools
		if (!config.parameters?.length && !config.description?.length) {
			return ""
		}
		const title = `## ${config.id}`
		const description = [`Description: ${config.description}`]

		if (!config.parameters?.length) {
			config.parameters = []
		}

		// Clone parameters to avoid mutating original
		const params = [...config.parameters]

		// Filter parameters based on dependencies and contextRequirements
		const filteredParams = params.filter((p) => {
			// Check dependencies first (existing behavior)
			if (p.dependencies?.length) {
				if (!p.dependencies.every((d) => registry.includes(d))) {
					return false
				}
			}

			// Check contextRequirements (new behavior)
			if (p.contextRequirements) {
				return p.contextRequirements(context)
			}

			return true
		})

		// Collect additional descriptions only from filtered parameters
		const additionalDesc = filteredParams.map((p) => p.description).filter((desc): desc is string => Boolean(desc))
		if (additionalDesc.length) {
			description.push(...additionalDesc)
		}

		// Build prompt sections efficiently
		const sections = [
			title,
			description.join("\n"),
			PromptBuilder.buildParametersSection(filteredParams),
			PromptBuilder.buildUsageSection(config.id, filteredParams),
		]

		return sections.filter(Boolean).join("\n")
	}

	/**
	 * Get tool override from promptConfiguration
	 * Maps tool IDs (snake_case) to proto field names (camelCase)
	 */
	private static getToolOverride(toolId: string, promptConfig?: PromptConfiguration): ToolPromptOverride | undefined {
		if (!promptConfig?.enableToolOverrides || !promptConfig.toolOverrides) {
			return undefined
		}

		// Map tool IDs to override fields
		const overrideMap: Record<string, ToolPromptOverride | undefined> = {
			execute_command: promptConfig.toolOverrides.executeCommand,
			read_file: promptConfig.toolOverrides.readFile,
			write_to_file: promptConfig.toolOverrides.writeToFile,
			replace_in_file: promptConfig.toolOverrides.replaceInFile,
			search_files: promptConfig.toolOverrides.searchFiles,
			list_files: promptConfig.toolOverrides.listFiles,
			list_code_definition_names: promptConfig.toolOverrides.listCodeDefinitionNames,
			browser_action: promptConfig.toolOverrides.browserAction,
			ask_followup_question: promptConfig.toolOverrides.askFollowupQuestion,
			attempt_completion: promptConfig.toolOverrides.attemptCompletion,
			use_mcp_tool: promptConfig.toolOverrides.useMcpTool,
			access_mcp_resource: promptConfig.toolOverrides.accessMcpResource,
			web_fetch: promptConfig.toolOverrides.webFetch,
			new_task: promptConfig.toolOverrides.newTask,
			plan_mode_respond: promptConfig.toolOverrides.planModeRespond,
			load_mcp_documentation: promptConfig.toolOverrides.loadMcpDocumentation,
		}

		return overrideMap[toolId]
	}

	/**
	 * Build tool prompt from ToolPromptOverride
	 */
	private static buildToolFromOverride(toolId: string, override: ToolPromptOverride): string {
		const sections: string[] = []

		// Tool title
		sections.push(`## ${toolId}`)

		// Description
		if (override.description) {
			sections.push(`Description: ${override.description}`)
		}

		// Parameters instruction
		if (override.parametersInstruction) {
			sections.push(`Parameters:\n${override.parametersInstruction}`)
		} else if (override.customParameters) {
			sections.push(`Parameters:\n${override.customParameters}`)
		}

		// Usage example
		if (override.usageExample) {
			sections.push(`Usage:\n${override.usageExample}`)
		}

		// Additional examples
		if (override.examples && override.examples.length > 0) {
			sections.push(`\nExamples:\n${override.examples.join("\n\n")}`)
		}

		return sections.filter(Boolean).join("\n")
	}

	private static buildParametersSection(params: any[]): string {
		if (!params.length) {
			return "Parameters: None"
		}

		const paramList = params.map((p) => {
			const requiredText = p.required ? "required" : "optional"
			return `- ${p.name}: (${requiredText}) ${p.instruction}`
		})

		return ["Parameters:", ...paramList].join("\n")
	}

	private static buildUsageSection(toolId: string, params: any[]): string {
		const usageSection = ["Usage:"]
		const usageTag = `<${toolId}>`
		const usageEndTag = `</${toolId}>`

		usageSection.push(usageTag)

		// Add parameter usage tags
		for (const param of params) {
			const usage = param.usage || ""
			usageSection.push(`<${param.name}>${usage}</${param.name}>`)
		}

		usageSection.push(usageEndTag)
		return usageSection.join("\n")
	}
}
