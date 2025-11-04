import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const getCapabilitiesTemplateText = (context: SystemPromptContext) => `CAPABILITIES

- you can use mcp tools to access information from the internet.
- you can use file reading and editing tools to read and edit files in the user's project and to store information in files.
- you can use search_files to perform regex searches across files in a specified directory, outputting context-rich results that include surrounding lines. This is particularly useful for understanding code patterns, finding specific implementations, or identifying areas that need refactoring.
- you are intelligent and able to reason about the user's task and the files in the user's project to come up with a plan to accomplish the task.
- Prefer to search you own knowlegebase before using external tools and resources.
- You have access to MCP servers that may provide additional tools and resources. Each server may provide different capabilities that you can use to accomplish tasks more effectively.`

export async function getCapabilitiesSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.CAPABILITIES]?.template || getCapabilitiesTemplateText

	const browserSupport = context.supportsBrowserUse ? ", use the browser" : ""
	const browserCapabilities = context.supportsBrowserUse
		? `\n- You can use the browser_action tool to interact with websites (including html files and locally running development servers) through a Puppeteer-controlled browser when you feel it is necessary in accomplishing the user's task. This tool is particularly useful for information gathering and research tasks and to verify the result of your work. you can also use this tool to know about latest amendments in the laws and regulations of india as well as search for news and updates in the legal domain.`
		: ""

	const templateEngine = new TemplateEngine()
	return templateEngine.resolve(template, context, {
		BROWSER_SUPPORT: browserSupport,
		BROWSER_CAPABILITIES: browserCapabilities,
		CWD: context.cwd || process.cwd(),
	})
}
