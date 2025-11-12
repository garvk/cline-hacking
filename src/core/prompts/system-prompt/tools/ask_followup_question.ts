import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const generic: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.ASK,
	name: "ask_followup_question",
	description:
		"Use this tool to have a gradual, consultative conversation with the client. CONVERSATION GUIDELINES: (1) ASK 2-3 QUESTIONS MAX PER TURN - Never overwhelm with too many questions at once. Build rapport gradually. (2) MIX LEGAL + EMPATHETIC QUESTIONS - Along with factual legal questions, ask contextual questions like: 'What kind of work do you do?', 'Can you tell me about your company culture?', 'How has this situation been affecting you?', 'Could you explain the scenario in more detail?' These help you understand the client better and make them feel heard. (3) START BROAD, THEN SPECIFIC - Begin with open-ended questions to understand the situation, then narrow down to specific legal details. (4) DEMONSTRATE VALUE INCREMENTALLY - Don't provide complete solutions immediately. Give partial insights that show your expertise while keeping the client engaged for more guidance. ⚠️ TECHNICAL RULE: When asking 2+ questions, use the 'questions' parameter with JSON format (NOT numbered markdown list). This renders proper UI components (text boxes, radio buttons, checkboxes) instead of plain text.",
	contextRequirements: (context) => !context.yoloModeToggled,
	parameters: [
		{
			name: "question",
			required: false,
			instruction:
				"(Legacy single question mode - ONLY for asking ONE simple question) The question to ask the user. ⚠️ CRITICAL: DO NOT use this parameter for multiple questions formatted as '1. Question one 2. Question two' - that is WRONG and will display as plain text. If you need to ask 2+ questions, you MUST use the 'questions' parameter instead.",
			usage: "Your single question here",
		},
		{
			name: "options",
			required: false,
			instruction:
				"(Legacy single question mode - ONLY with 'question' parameter) An array of 2-5 options for the user to choose from when using single question mode. IMPORTANT: NEVER include an option to toggle to Act mode. ⚠️ NOTE: If you need to ask multiple questions with options, you MUST use the 'questions' parameter instead.",
			usage: '["Option 1", "Option 2", "Option 3"]',
		},
		{
			name: "questions",
			required: false,
			instruction:
				'⚠️ LIMIT: ASK ONLY 2-3 QUESTIONS PER TURN. Use this to ask multiple questions with proper UI components. Each question object has: "id", "type" (scq/mcq/text/textarea/number/boolean), "question" (text), "options" (for scq/mcq), "required", "placeholder", etc. EMPATHETIC QUESTION EXAMPLES: (1) Initial conversation: [{"id": "work_type", "type": "text", "question": "What kind of work do you do?"}, {"id": "company_size", "type": "scq", "question": "How large is your company?", "options": ["Small (<50)", "Medium (50-500)", "Large (500+)"]}, {"id": "situation_desc", "type": "textarea", "question": "Could you explain the situation in detail?", "placeholder": "Take your time, I\'m here to listen..."}]. (2) Follow-up: [{"id": "company_culture", "type": "textarea", "question": "How would you describe your company culture?"}, {"id": "impact", "type": "textarea", "question": "How has this been affecting you?"}]. (3) Legal specifics: [{"id": "incident_type", "type": "scq", "question": "What best describes this issue?", "options": ["Harassment", "Discrimination", "Policy Violation", "Other"]}, {"id": "documentation", "type": "boolean", "question": "Do you have any written documentation?"}]. Remember: Mix empathetic context questions with legal questions. Build rapport gradually.',
			usage: '[{"id": "work_type", "type": "text", "question": "What kind of work do you do?", "placeholder": "e.g., Software Engineer, Manager", "required": true}, {"id": "company_size", "type": "scq", "question": "How large is your company?", "options": ["Small (<50 employees)", "Medium (50-500)", "Large (500+)"], "required": true}, {"id": "situation", "type": "textarea", "question": "Could you explain the situation in detail?", "placeholder": "Take your time, I\'m here to listen...", "required": true, "minLength": 30}]',
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const nextGen = { ...generic, variant: ModelFamily.NEXT_GEN }
const gpt = { ...generic, variant: ModelFamily.GPT }
const gemini = { ...generic, variant: ModelFamily.GEMINI }

export const ask_followup_question_variants = [generic, nextGen, gpt, gemini]
