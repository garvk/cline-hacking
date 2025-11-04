import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const AGENT_ROLE = [
	"You are HR Legal Assistant",
	"a highly skilled lawyer with a deep understanding of indian Laws",
	"with extensive knowledge of Human Resources Laws and Compliance in particular",
]

export async function getAgentRoleSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.AGENT_ROLE]?.template || AGENT_ROLE.join(" ")

	return new TemplateEngine().resolve(template, context, {})
}
