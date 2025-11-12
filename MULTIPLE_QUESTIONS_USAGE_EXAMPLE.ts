/**
 * Example usage of the Multiple Questions Feature
 * This file demonstrates how to use the enhanced ask_followup_question tool
 * with multiple questions and different input types.
 */

import { createQuestion, Question } from "./src/shared/QuestionTypes"

// ============================================================================
// Example 1: Simple Single Choice Question (SCQ)
// ============================================================================

const singleChoiceExample = () => {
	const questions: Question[] = [
		createQuestion("language", "scq", "What programming language would you like to use?", {
			options: ["JavaScript", "Python", "Go", "Rust"],
			required: true,
		}),
	]

	// This would be sent to the AI as:
	const toolUse = {
		tool: "ask_followup_question",
		questions: JSON.stringify(questions),
	}

	// User response would be:
	const userResponse = {
		responses: {
			language: "JavaScript",
		},
	}

	return { toolUse, userResponse }
}

// ============================================================================
// Example 2: Multiple Choice Question (MCQ)
// ============================================================================

const multipleChoiceExample = () => {
	const questions: Question[] = [
		createQuestion("frameworks", "mcq", "Which frameworks are you familiar with? (Select all that apply)", {
			options: ["React", "Vue", "Angular", "Svelte"],
			required: false,
		}),
	]

	// User can select multiple options:
	const userResponse = {
		responses: {
			frameworks: ["React", "Vue"], // Array of selected options
		},
	}

	return { questions, userResponse }
}

// ============================================================================
// Example 3: Text Input Questions
// ============================================================================

const textInputExample = () => {
	const questions: Question[] = [
		// Short text input
		createQuestion("project_name", "text", "What would you like to name your project?", {
			placeholder: "my-awesome-project",
			required: true,
			minLength: 3,
			maxLength: 50,
		}),

		// Long text input (textarea)
		createQuestion("description", "textarea", "Please provide a detailed description", {
			placeholder: "Enter description here...",
			required: false,
			maxLength: 500,
		}),
	]

	const userResponse = {
		responses: {
			project_name: "my-awesome-app",
			description: "This is a web application for...",
		},
	}

	return { questions, userResponse }
}

// ============================================================================
// Example 4: Number and Boolean Questions
// ============================================================================

const numberAndBooleanExample = () => {
	const questions: Question[] = [
		createQuestion("port", "number", "What port should the development server run on?", {
			defaultValue: "3000",
			min: 1000,
			max: 65535,
			required: true,
		}),

		createQuestion("use_typescript", "boolean", "Would you like to use TypeScript?", {
			required: true,
		}),
	]

	const userResponse = {
		responses: {
			port: "3000",
			use_typescript: "true", // Boolean values are stored as strings
		},
	}

	return { questions, userResponse }
}

// ============================================================================
// Example 5: Complex Multi-Question Form
// ============================================================================

const complexFormExample = () => {
	const questions: Question[] = [
		// Language selection
		createQuestion("language", "scq", "What programming language?", {
			options: ["JavaScript", "Python", "Go"],
			required: true,
		}),

		// Framework selection (conditional based on language)
		createQuestion("framework", "mcq", "Which frameworks? (Select all)", {
			options: ["React", "Vue", "Angular", "Express"],
			required: false,
		}),

		// Project details
		createQuestion("project_name", "text", "Project name?", {
			placeholder: "my-project",
			required: true,
			minLength: 3,
		}),

		createQuestion("description", "textarea", "Project description?", {
			placeholder: "Describe your project...",
			required: false,
		}),

		// Configuration
		createQuestion("port", "number", "Port number?", {
			defaultValue: "3000",
			min: 1000,
			max: 65535,
		}),

		createQuestion("git_init", "boolean", "Initialize Git repository?", {
			required: true,
		}),
	]

	const userResponse = {
		responses: {
			language: "JavaScript",
			framework: ["React", "Express"],
			project_name: "my-awesome-app",
			description: "A full-stack web application",
			port: "3000",
			git_init: "true",
		},
	}

	return { questions, userResponse }
}

// ============================================================================
// Example 6: How to Parse and Use Responses in Backend
// ============================================================================

const parseResponsesExample = () => {
	// When user submits, the response text contains JSON:
	const responseText = `{"responses":{"language":"JavaScript","framework":["React","Vue"],"project_name":"my-app"}}`

	// Parse the response:
	const parsed = JSON.parse(responseText)
	const responses = parsed.responses

	// Use the responses:
	const selectedLanguage = responses.language as string // "JavaScript"
	const selectedFrameworks = responses.framework as string[] // ["React", "Vue"]
	const projectName = responses.project_name as string // "my-app"

	// Example: Generate project setup code
	console.log(`Creating ${projectName} with ${selectedLanguage}`)
	console.log(`Frameworks: ${selectedFrameworks.join(", ")}`)

	return { selectedLanguage, selectedFrameworks, projectName }
}

// ============================================================================
// Example 7: Handling Responses in Assistant Message
// ============================================================================

const handleResponseInAssistant = (responseText: string) => {
	try {
		const { responses } = JSON.parse(responseText)

		// Build a formatted summary for the assistant
		const summary = Object.entries(responses)
			.map(([key, value]) => {
				if (Array.isArray(value)) {
					return `${key}: ${value.join(", ")}`
				}
				return `${key}: ${value}`
			})
			.join("\n")

		return `User provided the following information:\n${summary}`
	} catch (error) {
		return "Failed to parse user responses"
	}
}

// ============================================================================
// Example 8: Dynamic Question Generation
// ============================================================================

const dynamicQuestionsExample = (userPreferences: { advanced: boolean }) => {
	const questions: Question[] = []

	// Always ask basic questions
	questions.push(
		createQuestion("project_type", "scq", "What type of project?", {
			options: ["Web App", "API", "CLI Tool", "Library"],
			required: true,
		}),
	)

	// Conditionally add advanced questions
	if (userPreferences.advanced) {
		questions.push(
			createQuestion("build_tool", "scq", "Preferred build tool?", {
				options: ["Webpack", "Vite", "Rollup", "esbuild"],
				required: false,
			}),

			createQuestion("testing", "mcq", "Testing frameworks?", {
				options: ["Jest", "Vitest", "Mocha", "Cypress"],
				required: false,
			}),
		)
	}

	return questions
}

// Export all examples
export {
	singleChoiceExample,
	multipleChoiceExample,
	textInputExample,
	numberAndBooleanExample,
	complexFormExample,
	parseResponsesExample,
	handleResponseInAssistant,
	dynamicQuestionsExample,
}

// ============================================================================
// Example 9: XML Format for Tool Use (What AI sends)
// ============================================================================

/*
The AI would send something like this:

<ask_followup_question>
<questions>
[
  {
    "id": "language",
    "type": "scq",
    "question": "What programming language would you like to use?",
    "options": ["JavaScript", "Python", "Go", "Rust"],
    "required": true
  },
  {
    "id": "project_name",
    "type": "text",
    "question": "What would you like to name your project?",
    "placeholder": "my-project",
    "required": true
  }
]
</questions>
</ask_followup_question>

And receives back:
{
  "responses": {
    "language": "JavaScript",
    "project_name": "my-awesome-app"
  }
}
*/
