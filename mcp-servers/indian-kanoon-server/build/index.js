#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js"
import axios from "axios"

const API_TOKEN = process.env.INDIANKANOON_API_TOKEN
if (!API_TOKEN) {
	throw new Error("INDIANKANOON_API_TOKEN environment variable is required")
}
const isValidSearchParams = (args) =>
	typeof args === "object" &&
	args !== null &&
	typeof args.formInput === "string" &&
	(args.pagenum === undefined || typeof args.pagenum === "number") &&
	(args.doctypes === undefined || typeof args.doctypes === "string") &&
	(args.fromdate === undefined || typeof args.fromdate === "string") &&
	(args.todate === undefined || typeof args.todate === "string") &&
	(args.title === undefined || typeof args.title === "string") &&
	(args.cite === undefined || typeof args.cite === "string") &&
	(args.author === undefined || typeof args.author === "string") &&
	(args.bench === undefined || typeof args.bench === "string") &&
	(args.maxcites === undefined || typeof args.maxcites === "number") &&
	(args.maxpages === undefined || typeof args.maxpages === "number")
const isValidDocumentParams = (args) =>
	typeof args === "object" &&
	args !== null &&
	typeof args.docId === "string" &&
	(args.maxcites === undefined || typeof args.maxcites === "number") &&
	(args.maxcitedby === undefined || typeof args.maxcitedby === "number")
const isValidDocumentFragmentParams = (args) =>
	typeof args === "object" && args !== null && typeof args.docId === "string" && typeof args.formInput === "string"
const isValidDocumentMetaParams = (args) => typeof args === "object" && args !== null && typeof args.docId === "string"
class IndianKanoonServer {
	server
	axiosInstance
	constructor() {
		this.server = new Server(
			{
				name: "indian-kanoon-server",
				version: "0.1.0",
			},
			{
				capabilities: {
					tools: {},
				},
			},
		)
		this.axiosInstance = axios.create({
			baseURL: "https://api.indiankanoon.org",
			headers: {
				Authorization: `Token ${API_TOKEN}`,
				Accept: "application/json",
			},
		})
		this.setupToolHandlers()
		// Error handling
		this.server.onerror = (error) => console.error("[MCP Error]", error)
		process.on("SIGINT", async () => {
			await this.server.close()
			process.exit(0)
		})
	}
	setupToolHandlers() {
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: [
				{
					name: "search_cases",
					description:
						"Search for legal documents in the Indian Kanoon database. Supports various filters like date ranges, document types, courts, and more. Returns matching documents with titles, headlines, and metadata.",
					inputSchema: {
						type: "object",
						properties: {
							formInput: {
								type: "string",
								description:
									'Search query. Can include phrases in quotes, and operators ANDD, ORR, NOTT (case-sensitive, need spaces). Example: "freedom of speech" ANDD NOTT censorship',
							},
							pagenum: {
								type: "number",
								description: "Page number (starts from 0 for first page)",
								default: 0,
							},
							doctypes: {
								type: "string",
								description:
									'Filter by document types. Examples: "supremecourt", "tribunals", "highcourts,cci". Available: supremecourt, delhi, bombay, kolkata, chennai, allahabad, andhra, chattisgarh, gauhati, jammu, srinagar, kerala, lucknow, orissa, uttaranchal, gujarat, himachal_pradesh, jharkhand, karnataka, madhyapradesh, patna, punjab, rajasthan, sikkim, kolkata_app, jodhpur, patna_orders, meghalaya, delhidc, aptel, drat, cat, cegat, stt, itat, consumer, cerc, cic, clb, copyrightboard, ipab, mrtp, sebisat, tdsat, trademark, greentribunal, cci',
							},
							fromdate: {
								type: "string",
								description: "Minimum date in DD-MM-YYYY format. Example: 01-10-2016",
							},
							todate: {
								type: "string",
								description: "Maximum date in DD-MM-YYYY format. Example: 31-12-2023",
							},
							title: {
								type: "string",
								description: "Search only in document titles",
							},
							cite: {
								type: "string",
								description: 'Filter by citation. Example: "1993 AIR"',
							},
							author: {
								type: "string",
								description: "Filter by judge who wrote the judgment",
							},
							bench: {
								type: "string",
								description: "Filter by judge on the bench",
							},
							maxcites: {
								type: "number",
								description: "Maximum number of citations to return for each document (max 50)",
								maximum: 50,
							},
							maxpages: {
								type: "number",
								description: "Fetch multiple pages in one call (max 1000 pages total)",
								maximum: 1000,
							},
						},
						required: ["formInput"],
					},
				},
				{
					name: "get_document",
					description:
						"Retrieve the full text of a legal document by its ID. Returns the complete document content, citations, and metadata.",
					inputSchema: {
						type: "object",
						properties: {
							docId: {
								type: "string",
								description: "The document ID from Indian Kanoon",
							},
							maxcites: {
								type: "number",
								description: "Maximum number of documents this document cites (max 50)",
								maximum: 50,
								default: 5,
							},
							maxcitedby: {
								type: "number",
								description: "Maximum number of documents that cite this document (max 50)",
								maximum: 50,
								default: 5,
							},
						},
						required: ["docId"],
					},
				},
				{
					name: "get_document_fragment",
					description:
						"Get specific fragments of a document that match a search query. Useful for finding relevant sections within a large document.",
					inputSchema: {
						type: "object",
						properties: {
							docId: {
								type: "string",
								description: "The document ID from Indian Kanoon",
							},
							formInput: {
								type: "string",
								description: "Search query to find matching fragments in the document",
							},
						},
						required: ["docId", "formInput"],
					},
				},
				{
					name: "get_document_meta",
					description:
						"Retrieve metadata about a document including citations, title, court, date, and other bibliographic information.",
					inputSchema: {
						type: "object",
						properties: {
							docId: {
								type: "string",
								description: "The document ID from Indian Kanoon",
							},
						},
						required: ["docId"],
					},
				},
			],
		}))
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			switch (request.params.name) {
				case "search_cases":
					return await this.handleSearchCases(request.params.arguments)
				case "get_document":
					return await this.handleGetDocument(request.params.arguments)
				case "get_document_fragment":
					return await this.handleGetDocumentFragment(request.params.arguments)
				case "get_document_meta":
					return await this.handleGetDocumentMeta(request.params.arguments)
				default:
					throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`)
			}
		})
	}
	async handleSearchCases(args) {
		if (!isValidSearchParams(args)) {
			throw new McpError(ErrorCode.InvalidParams, "Invalid search parameters")
		}
		try {
			const params = {
				formInput: args.formInput,
				pagenum: args.pagenum ?? 0,
			}
			// Add optional parameters
			if (args.doctypes) params.doctypes = args.doctypes
			if (args.fromdate) params.fromdate = args.fromdate
			if (args.todate) params.todate = args.todate
			if (args.title) params.title = args.title
			if (args.cite) params.cite = args.cite
			if (args.author) params.author = args.author
			if (args.bench) params.bench = args.bench
			if (args.maxcites) params.maxcites = Math.min(args.maxcites, 50)
			if (args.maxpages) params.maxpages = Math.min(args.maxpages, 1000)
			const response = await this.axiosInstance.post("/search/", null, { params })
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(response.data, null, 2),
					},
				],
			}
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return {
					content: [
						{
							type: "text",
							text: `Indian Kanoon API error: ${error.response?.data?.message ?? error.message}`,
						},
					],
					isError: true,
				}
			}
			throw error
		}
	}
	async handleGetDocument(args) {
		if (!isValidDocumentParams(args)) {
			throw new McpError(ErrorCode.InvalidParams, "Invalid document parameters")
		}
		try {
			const params = {}
			if (args.maxcites) params.maxcites = Math.min(args.maxcites, 50)
			if (args.maxcitedby) params.maxcitedby = Math.min(args.maxcitedby, 50)
			const response = await this.axiosInstance.post(`/doc/${args.docId}/`, null, { params })
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(response.data, null, 2),
					},
				],
			}
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return {
					content: [
						{
							type: "text",
							text: `Indian Kanoon API error: ${error.response?.data?.message ?? error.message}`,
						},
					],
					isError: true,
				}
			}
			throw error
		}
	}
	async handleGetDocumentFragment(args) {
		if (!isValidDocumentFragmentParams(args)) {
			throw new McpError(ErrorCode.InvalidParams, "Invalid document fragment parameters")
		}
		try {
			const params = {
				formInput: args.formInput,
			}
			const response = await this.axiosInstance.post(`/docfragment/${args.docId}/`, null, { params })
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(response.data, null, 2),
					},
				],
			}
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return {
					content: [
						{
							type: "text",
							text: `Indian Kanoon API error: ${error.response?.data?.message ?? error.message}`,
						},
					],
					isError: true,
				}
			}
			throw error
		}
	}
	async handleGetDocumentMeta(args) {
		if (!isValidDocumentMetaParams(args)) {
			throw new McpError(ErrorCode.InvalidParams, "Invalid document meta parameters")
		}
		try {
			const response = await this.axiosInstance.post(`/docmeta/${args.docId}/`)
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(response.data, null, 2),
					},
				],
			}
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return {
					content: [
						{
							type: "text",
							text: `Indian Kanoon API error: ${error.response?.data?.message ?? error.message}`,
						},
					],
					isError: true,
				}
			}
			throw error
		}
	}
	async run() {
		const transport = new StdioServerTransport()
		await this.server.connect(transport)
		console.error("Indian Kanoon MCP server running on stdio")
	}
}
const server = new IndianKanoonServer()
server.run().catch(console.error)
//# sourceMappingURL=index.js.map
