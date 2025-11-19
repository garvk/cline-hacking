import { VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useState } from "react"
import { type PromptConfiguration, promptConfigLoader } from "@/services/prompt-config-loader"
import Section from "../Section"
import { updateSetting } from "../utils/settingsHandlers"

interface PromptSettingsSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const PromptSettingsSection = ({ renderSectionHeader }: PromptSettingsSectionProps) => {
	const [configurations, setConfigurations] = useState<Record<string, PromptConfiguration>>({})
	const [currentConfig, setCurrentConfig] = useState<string>("default")
	const [selectedConfigDetails, setSelectedConfigDetails] = useState<PromptConfiguration | null>(null)

	useEffect(() => {
		// Load configurations on mount
		const loadConfigs = async () => {
			const configs = await promptConfigLoader.loadConfigurations()
			setConfigurations(configs.configurations)
			const current = promptConfigLoader.getCurrentConfigurationKey()
			setCurrentConfig(current)
			const details = await promptConfigLoader.getCurrentConfiguration()
			setSelectedConfigDetails(details)
		}
		loadConfigs()
	}, [])

	const handleConfigChange = async (event: any) => {
		const selectedKey = event.target.value
		setCurrentConfig(selectedKey)
		promptConfigLoader.setCurrentConfiguration(selectedKey)
		const details = await promptConfigLoader.getConfiguration(selectedKey)
		setSelectedConfigDetails(details)

		// Sync to backend StateManager
		updateSetting("currentPromptConfigKey", selectedKey)

		// Show a notification that the change will take effect on reload
		console.log(`Prompt configuration changed to: ${selectedKey}. Changes will take effect on next task.`)
	}

	const getConfigTypeLabel = (config: PromptConfiguration) => {
		if (config.config.overrideType === "PROMPT_OVERRIDE_TYPE_SIMPLE") {
			return "Simple Mode (Complete Replacement)"
		} else if (config.config.overrideType === "PROMPT_OVERRIDE_TYPE_COMPLEX") {
			return "Complex Mode (Component/Tool Overrides)"
		}
		return "Default Behavior"
	}

	return (
		<div>
			{renderSectionHeader("prompts")}
			<Section>
				<div className="mb-4">
					<label className="block mb-2 font-medium" htmlFor="prompt-config-dropdown">
						Prompt Configuration
					</label>
					<VSCodeDropdown
						className="w-full"
						id="prompt-config-dropdown"
						onChange={handleConfigChange}
						value={currentConfig}>
						{Object.entries(configurations).map(([key, config]) => (
							<VSCodeOption key={key} value={key}>
								{config.name}
							</VSCodeOption>
						))}
					</VSCodeDropdown>
					<p className="text-xs mt-2 text-[var(--vscode-descriptionForeground)]">
						Select a prompt configuration to customize Cline's behavior. Changes take effect on the next task.
					</p>
				</div>

				{selectedConfigDetails && (
					<div className="mb-4 p-3 bg-[var(--vscode-textCodeBlock-background)] rounded">
						<h4 className="font-medium mb-2">{selectedConfigDetails.name}</h4>
						<p className="text-sm text-[var(--vscode-descriptionForeground)] mb-2">
							{selectedConfigDetails.description}
						</p>
						<div className="text-xs text-[var(--vscode-descriptionForeground)]">
							<p className="mb-1">
								<strong>Type:</strong> {getConfigTypeLabel(selectedConfigDetails)}
							</p>
							{selectedConfigDetails.config.disabledTools &&
								selectedConfigDetails.config.disabledTools.length > 0 && (
									<p className="mb-1">
										<strong>Disabled Tools:</strong> {selectedConfigDetails.config.disabledTools.join(", ")}
									</p>
								)}
							{selectedConfigDetails.config.componentOverrides &&
								Object.keys(selectedConfigDetails.config.componentOverrides).length > 0 && (
									<p className="mb-1">
										<strong>Component Overrides:</strong>{" "}
										{Object.keys(selectedConfigDetails.config.componentOverrides).length} component(s)
									</p>
								)}
							{selectedConfigDetails.config.toolOverrides &&
								Object.keys(selectedConfigDetails.config.toolOverrides).length > 0 && (
									<p className="mb-1">
										<strong>Tool Overrides:</strong>{" "}
										{Object.keys(selectedConfigDetails.config.toolOverrides).length} tool(s)
									</p>
								)}
						</div>
					</div>
				)}

				<div className="mt-4 p-3 bg-[var(--vscode-textPreformat-background)] rounded">
					<p className="text-xs text-[var(--vscode-descriptionForeground)]">
						<strong>Configuration Options:</strong>
					</p>
					<ul className="text-xs text-[var(--vscode-descriptionForeground)] mt-2 ml-4 list-disc">
						<li>
							<strong>Default Cline:</strong> Standard behavior with no customizations
						</li>
						<li>
							<strong>Legal Assistant:</strong> Specialized for legal document analysis (Simple Mode)
						</li>
						<li>
							<strong>HR Specialist:</strong> HR tasks with custom rules and capabilities (Complex Mode)
						</li>
						<li>
							<strong>Code Reviewer:</strong> Code review with customized tool descriptions (Complex Mode)
						</li>
						<li>
							<strong>Data Analyst:</strong> Data analysis focus with statistical capabilities (Complex Mode)
						</li>
					</ul>
					<p className="text-xs text-[var(--vscode-descriptionForeground)] mt-3">
						You can also set a default configuration using the <code>CLINE_PROMPT_CONFIG</code> environment variable.
						See{" "}
						<VSCodeLink
							className="text-inherit"
							href="https://github.com/cline/cline"
							style={{ fontSize: "inherit", textDecoration: "underline" }}>
							documentation
						</VSCodeLink>{" "}
						for more details.
					</p>
				</div>
			</Section>
		</div>
	)
}

export default PromptSettingsSection
