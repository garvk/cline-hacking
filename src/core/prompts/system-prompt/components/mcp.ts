import type { McpServer } from "@/shared/mcp"
import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const MCP_TEMPLATE_TEXT = `MCP SERVERS

The Model Context Protocol (MCP) enables communication between the system and locally running MCP servers that provide additional tools and resources to extend your capabilities.

# MCP USAGE RULES

- Do not overuse MCP tools. Before calling any MCP server tool, first check whether the answer can be provided from internal knowledge or previously cached context.
- Only use MCP tools when the user explicitly requests information that requires external lookup (e.g. specific case law, statutory document, government circular, database record, etc.).
- Never call an MCP tool repeatedly for the same type of information unless the user has added new criteria.
- When fetching results from an MCP server search, you must limit the output to a maximum of 10–20 relevant items. If the tool returns more, summarise or truncate instead of flooding the user with excessive data.
- If a query is broad (e.g. “all Supreme Court judgments about maternity leave”), do not retrieve everything. Ask the user to narrow the scope (e.g. timeframe, jurisdiction, act involved) before calling MCP.
- If a result set is large, provide a short list first and ask whether the user wants to expand further.
- Do not make multiple MCP calls in a single response unless unavoidable. One MCP call → wait for user response → then continue.
- If an MCP server has multiple tools, choose the most specific one instead of running several overlapping queries.
- MCP is a **secondary knowledge source** — default to internal reasoning first, MCP second.


# Connected MCP Servers

When a server is connected, you can use the server's tools via the \`use_mcp_tool\` tool, and access the server's resources via the \`access_mcp_resource\` tool.

{{MCP_SERVERS_LIST}}`

export async function getMcp(variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	const servers = context.mcpHub?.getServers() || []
	// Skip the section if there are no servers connected / available
	if (servers.length === 0) {
		return undefined
	}
	return await getMcpServers(servers, variant, context)
}

async function getMcpServers(servers: McpServer[], variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.MCP]?.template || MCP_TEMPLATE_TEXT

	const serversList = servers.length > 0 ? formatMcpServersList(servers) : "(No MCP servers currently connected)"
	return new TemplateEngine().resolve(template, context, {
		MCP_SERVERS_LIST: serversList,
	})
}

function formatMcpServersList(servers: McpServer[]): string {
	return servers
		.filter((server) => server.status === "connected")
		.map((server) => {
			const tools = server.tools
				?.map((tool) => {
					const schemaStr = tool.inputSchema
						? `    Input Schema:
    ${JSON.stringify(tool.inputSchema, null, 2).split("\n").join("\n    ")}`
						: ""

					return `- ${tool.name}: ${tool.description}\n${schemaStr}`
				})
				.join("\n\n")

			const templates = server.resourceTemplates
				?.map((template) => `- ${template.uriTemplate} (${template.name}): ${template.description}`)
				.join("\n")

			const resources = server.resources
				?.map((resource) => `- ${resource.uri} (${resource.name}): ${resource.description}`)
				.join("\n")

			const config = JSON.parse(server.config)

			return (
				`## ${server.name}` +
				(config.command
					? ` (\`${config.command}${config.args && Array.isArray(config.args) ? ` ${config.args.join(" ")}` : ""}\`)`
					: "") +
				(tools ? `\n\n### Available Tools\n${tools}` : "") +
				(templates ? `\n\n### Resource Templates\n${templates}` : "") +
				(resources ? `\n\n### Direct Resources\n${resources}` : "")
			)
		})
		.join("\n\n")
}
