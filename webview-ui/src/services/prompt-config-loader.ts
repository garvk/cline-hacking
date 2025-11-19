/**
 * Service for loading and managing prompt configurations
 */

export interface PromptConfiguration {
	name: string
	description: string
	config: {
		overrideType: string
		simplePromptText?: string
		componentOverrides?: Record<string, string>
		enableToolOverrides?: boolean
		toolOverrides?: Record<string, any>
		disabledComponents?: string[]
		disabledTools?: string[]
	}
}

export interface PromptConfigurations {
	configurations: Record<string, PromptConfiguration>
	metadata: {
		version: string
		lastUpdated: string
		description: string
		usage: string
	}
}

class PromptConfigLoader {
	private configurations: PromptConfigurations | null = null
	private currentConfigKey: string = this.getInitialConfigKey()

	private getInitialConfigKey(): string {
		// Check environment variable first
		const envConfig = import.meta.env.VITE_CLINE_PROMPT_CONFIG
		if (envConfig && typeof envConfig === "string") {
			console.log(`Using prompt config from environment variable: ${envConfig}`)
			return envConfig
		}
		return "default"
	}

	async loadConfigurations(): Promise<PromptConfigurations> {
		if (this.configurations) {
			return this.configurations
		}

		try {
			const response = await fetch("/prompt-configurations.json")
			if (!response.ok) {
				throw new Error(`Failed to load configurations: ${response.statusText}`)
			}
			this.configurations = await response.json()
			console.log("Loaded prompt configurations:", this.configurations)

			// Initialize localStorage with env variable if not already set
			const stored = localStorage.getItem("cline_prompt_config")
			if (!stored && this.currentConfigKey !== "default") {
				localStorage.setItem("cline_prompt_config", this.currentConfigKey)
				console.log(`Initialized localStorage with config from env: ${this.currentConfigKey}`)
			}

			return this.configurations!
		} catch (error) {
			console.error("Error loading prompt configurations:", error)
			// Return default empty configuration
			return {
				configurations: {
					default: {
						name: "Default Cline",
						description: "Standard Cline behavior",
						config: {
							overrideType: "PROMPT_OVERRIDE_TYPE_UNSPECIFIED",
						},
					},
				},
				metadata: {
					version: "1.0.0",
					lastUpdated: new Date().toISOString(),
					description: "Fallback configuration",
					usage: "Default configuration used when loading fails",
				},
			}
		}
	}

	async getConfiguration(key: string): Promise<PromptConfiguration | null> {
		const configs = await this.loadConfigurations()
		return configs.configurations[key] || null
	}

	async getCurrentConfiguration(): Promise<PromptConfiguration> {
		const config = await this.getConfiguration(this.currentConfigKey)
		if (!config) {
			// Fall back to default
			return (await this.getConfiguration("default"))!
		}
		return config
	}

	setCurrentConfiguration(key: string) {
		this.currentConfigKey = key
		localStorage.setItem("cline_prompt_config", key)
		console.log(`Set current prompt configuration to: ${key}`)
	}

	getCurrentConfigurationKey(): string {
		// Priority order: localStorage > environment variable > default
		const stored = localStorage.getItem("cline_prompt_config")
		if (stored) {
			this.currentConfigKey = stored
			return this.currentConfigKey
		}

		// Check environment variable
		const envConfig = import.meta.env.VITE_CLINE_PROMPT_CONFIG
		if (envConfig && typeof envConfig === "string") {
			this.currentConfigKey = envConfig
			return this.currentConfigKey
		}

		return this.currentConfigKey
	}

	async getAllConfigurationKeys(): Promise<string[]> {
		const configs = await this.loadConfigurations()
		return Object.keys(configs.configurations)
	}

	async getMetadata() {
		const configs = await this.loadConfigurations()
		return configs.metadata
	}
}

// Singleton instance
export const promptConfigLoader = new PromptConfigLoader()

// Initialize on module load
promptConfigLoader.loadConfigurations().then(() => {
	console.log("Prompt configurations initialized")
})
