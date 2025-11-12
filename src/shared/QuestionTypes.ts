/**
 * Types for enhanced question system supporting multiple questions with different input types
 */

export type QuestionType = "mcq" | "scq" | "text" | "textarea" | "number" | "boolean"

export interface Question {
	id: string // Unique identifier for the question
	type: QuestionType
	question: string // The question text
	options?: string[] // For MCQ/SCQ - array of options
	required?: boolean // Whether answer is required
	placeholder?: string // Placeholder text for text/textarea inputs
	defaultValue?: string // Default value for inputs
	minLength?: number // For text/textarea validation
	maxLength?: number // For text/textarea validation
	min?: number // For number inputs
	max?: number // For number inputs
}

export interface MultipleQuestions {
	questions: Question[]
	responses?: Record<string, string | string[]> // question id -> answer(s)
	allAnswered?: boolean // Whether all required questions have been answered
}

export interface ClineAskMultipleQuestions extends MultipleQuestions {
	// This will be stored in message.text as JSON
}

// Helper function to create a question
export function createQuestion(
	id: string,
	type: QuestionType,
	question: string,
	options?: {
		options?: string[]
		required?: boolean
		placeholder?: string
		defaultValue?: string
		minLength?: number
		maxLength?: number
		min?: number
		max?: number
	},
): Question {
	return {
		id,
		type,
		question,
		required: options?.required ?? true,
		...(options?.options && { options: options.options }),
		...(options?.placeholder && { placeholder: options.placeholder }),
		...(options?.defaultValue && { defaultValue: options.defaultValue }),
		...(options?.minLength !== undefined && { minLength: options.minLength }),
		...(options?.maxLength !== undefined && { maxLength: options.maxLength }),
		...(options?.min !== undefined && { min: options.min }),
		...(options?.max !== undefined && { max: options.max }),
	}
}

// Helper to validate responses
export function validateResponses(questions: Question[], responses: Record<string, string | string[]>): boolean {
	for (const question of questions) {
		if (question.required) {
			const response = responses[question.id]
			if (!response || (Array.isArray(response) && response.length === 0)) {
				return false
			}
			if (typeof response === "string" && response.trim().length === 0) {
				return false
			}
		}
	}
	return true
}
