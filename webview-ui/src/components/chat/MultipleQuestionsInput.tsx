import { AskResponseRequest } from "@shared/proto/cline/task"
import { Question, validateResponses } from "@shared/QuestionTypes"
import React, { useCallback, useState } from "react"
import styled from "styled-components"
import { TaskServiceClient } from "@/services/grpc-client"

const QuestionsContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 24px;
	padding: 16px 0;
`

const QuestionBlock = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
`

const QuestionLabel = styled.div<{ required?: boolean }>`
	font-size: 14px;
	font-weight: 600;
	color: hsl(var(--foreground, 222 47% 11%));
	display: flex;
	align-items: center;
	gap: 6px;

	${(props) =>
		props.required &&
		`
		&::after {
			content: "*";
			color: hsl(var(--destructive, 0 84% 60%));
			font-weight: bold;
		}
	`}
`

const OptionButton = styled.button<{ isSelected?: boolean; isDisabled?: boolean }>`
	padding: 12px 16px;
	background: ${(props) => (props.isSelected ? "hsl(var(--primary, 221 83% 53%))" : "hsl(var(--card, 0 0% 100%))")};
	color: ${(props) => (props.isSelected ? "white" : "hsl(var(--foreground, 222 47% 11%))")};
	border: 2px solid
		${(props) => (props.isSelected ? "hsl(var(--primary, 221 83% 53%))" : "hsl(var(--border, 214 32% 91%))")};
	border-radius: var(--radius-md, 12px);
	cursor: ${(props) => (props.isDisabled ? "not-allowed" : "pointer")};
	text-align: left;
	font-size: 14px;
	font-weight: 500;
	transition: all var(--transition-fast, 150ms);
	display: flex;
	align-items: center;
	gap: 10px;
	box-shadow: ${(props) =>
		props.isSelected
			? "var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))"
			: "var(--shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1))"};
	opacity: ${(props) => (props.isDisabled ? 0.5 : 1)};

	${(props) =>
		!props.isDisabled &&
		!props.isSelected &&
		`
		&:hover {
			background: hsl(var(--primary, 221 83% 53%) / 0.1);
			border-color: hsl(var(--primary, 221 83% 53%));
			transform: translateY(-1px);
			box-shadow: var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1));
		}
		
		&:active {
			transform: translateY(0);
		}
	`}

	${(props) =>
		props.isSelected &&
		`
		&::before {
			content: "✓";
			font-size: 16px;
			font-weight: bold;
		}
	`}
`

const CheckboxButton = styled(OptionButton)`
	${(props) =>
		props.isSelected &&
		`
		&::before {
			content: "☑";
			font-size: 16px;
			font-weight: bold;
		}
	`}
`

const TextInput = styled.input`
	padding: 12px 16px;
	background: hsl(var(--card, 0 0% 100%));
	color: hsl(var(--foreground, 222 47% 11%));
	border: 2px solid hsl(var(--border, 214 32% 91%));
	border-radius: var(--radius-md, 12px);
	font-size: 14px;
	font-family: inherit;
	transition: all var(--transition-fast, 150ms);
	box-shadow: var(--shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1));

	&:focus {
		outline: none;
		border-color: hsl(var(--primary, 221 83% 53%));
		box-shadow: 0 0 0 3px hsl(var(--primary, 221 83% 53%) / 0.1);
	}

	&::placeholder {
		color: hsl(var(--muted-foreground, 215 16% 47%));
	}
`

const TextArea = styled.textarea`
	padding: 12px 16px;
	background: hsl(var(--card, 0 0% 100%));
	color: hsl(var(--foreground, 222 47% 11%));
	border: 2px solid hsl(var(--border, 214 32% 91%));
	border-radius: var(--radius-md, 12px);
	font-size: 14px;
	font-family: inherit;
	transition: all var(--transition-fast, 150ms);
	box-shadow: var(--shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1));
	resize: vertical;
	min-height: 100px;

	&:focus {
		outline: none;
		border-color: hsl(var(--primary, 221 83% 53%));
		box-shadow: 0 0 0 3px hsl(var(--primary, 221 83% 53%) / 0.1);
	}

	&::placeholder {
		color: hsl(var(--muted-foreground, 215 16% 47%));
	}
`

const SubmitButton = styled.button<{ isDisabled?: boolean }>`
	padding: 14px 24px;
	background: hsl(var(--primary, 221 83% 53%));
	color: white;
	border: none;
	border-radius: var(--radius-md, 12px);
	font-size: 14px;
	font-weight: 600;
	cursor: ${(props) => (props.isDisabled ? "not-allowed" : "pointer")};
	transition: all var(--transition-fast, 150ms);
	box-shadow: var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1));
	opacity: ${(props) => (props.isDisabled ? 0.5 : 1)};

	${(props) =>
		!props.isDisabled &&
		`
		&:hover {
			background: hsl(var(--primary, 221 83% 53%) / 0.9);
			transform: translateY(-1px);
			box-shadow: var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));
		}
		
		&:active {
			transform: translateY(0);
		}
	`}
`

const OptionsGrid = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
`

interface MultipleQuestionsInputProps {
	questions: Question[]
	isActive: boolean
	existingResponses?: Record<string, string | string[]>
	allAnswered?: boolean
}

export const MultipleQuestionsInput: React.FC<MultipleQuestionsInputProps> = ({
	questions,
	isActive,
	existingResponses = {},
	allAnswered = false,
}) => {
	const [responses, setResponses] = useState<Record<string, string | string[]>>(existingResponses)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSCQSelect = useCallback(
		(questionId: string, option: string) => {
			if (!isActive || allAnswered) return
			setResponses((prev) => ({
				...prev,
				[questionId]: option,
			}))
		},
		[isActive, allAnswered],
	)

	const handleMCQToggle = useCallback(
		(questionId: string, option: string) => {
			if (!isActive || allAnswered) return
			setResponses((prev) => {
				const current = prev[questionId] as string[] | undefined
				const currentArray = Array.isArray(current) ? current : []
				const isSelected = currentArray.includes(option)

				return {
					...prev,
					[questionId]: isSelected ? currentArray.filter((o) => o !== option) : [...currentArray, option],
				}
			})
		},
		[isActive, allAnswered],
	)

	const handleTextChange = useCallback(
		(questionId: string, value: string) => {
			if (!isActive || allAnswered) return
			setResponses((prev) => ({
				...prev,
				[questionId]: value,
			}))
		},
		[isActive, allAnswered],
	)

	const handleBooleanToggle = useCallback(
		(questionId: string, value: boolean) => {
			if (!isActive || allAnswered) return
			setResponses((prev) => ({
				...prev,
				[questionId]: value ? "true" : "false",
			}))
		},
		[isActive, allAnswered],
	)

	const handleSubmit = useCallback(async () => {
		if (!isActive || allAnswered || isSubmitting) return

		// Validate all required questions are answered
		const isValid = validateResponses(questions, responses)
		if (!isValid) {
			alert("Please answer all required questions before submitting.")
			return
		}

		setIsSubmitting(true)
		try {
			// Send responses as JSON
			await TaskServiceClient.askResponse(
				AskResponseRequest.create({
					responseType: "messageResponse",
					text: JSON.stringify({ responses }),
					images: [],
				}),
			)
		} catch (error) {
			console.error("Error sending question responses:", error)
			setIsSubmitting(false)
		}
	}, [questions, responses, isActive, allAnswered, isSubmitting])

	const canSubmit = !allAnswered && isActive && validateResponses(questions, responses) && !isSubmitting

	return (
		<QuestionsContainer>
			{questions.map((question) => (
				<QuestionBlock key={question.id}>
					<QuestionLabel required={question.required}>{question.question}</QuestionLabel>

					{question.type === "scq" && question.options && (
						<OptionsGrid>
							{question.options.map((option, index) => (
								<OptionButton
									isDisabled={!isActive || allAnswered}
									isSelected={responses[question.id] === option}
									key={index}
									onClick={() => handleSCQSelect(question.id, option)}>
									<span className="ph-no-capture" style={{ flex: 1 }}>
										{option}
									</span>
								</OptionButton>
							))}
						</OptionsGrid>
					)}

					{question.type === "mcq" && question.options && (
						<OptionsGrid>
							{question.options.map((option, index) => {
								const selectedOptions = Array.isArray(responses[question.id])
									? (responses[question.id] as string[])
									: []
								const isSelected = selectedOptions.includes(option)

								return (
									<CheckboxButton
										isDisabled={!isActive || allAnswered}
										isSelected={isSelected}
										key={index}
										onClick={() => handleMCQToggle(question.id, option)}>
										<span className="ph-no-capture" style={{ flex: 1 }}>
											{option}
										</span>
									</CheckboxButton>
								)
							})}
						</OptionsGrid>
					)}

					{question.type === "text" && (
						<TextInput
							disabled={!isActive || allAnswered}
							maxLength={question.maxLength}
							minLength={question.minLength}
							onChange={(e) => handleTextChange(question.id, e.target.value)}
							placeholder={question.placeholder || "Enter your answer..."}
							type="text"
							value={(responses[question.id] as string) || ""}
						/>
					)}

					{question.type === "textarea" && (
						<TextArea
							disabled={!isActive || allAnswered}
							maxLength={question.maxLength}
							minLength={question.minLength}
							onChange={(e) => handleTextChange(question.id, e.target.value)}
							placeholder={question.placeholder || "Enter your answer..."}
							value={(responses[question.id] as string) || ""}
						/>
					)}

					{question.type === "number" && (
						<TextInput
							disabled={!isActive || allAnswered}
							max={question.max}
							min={question.min}
							onChange={(e) => handleTextChange(question.id, e.target.value)}
							placeholder={question.placeholder || "Enter a number..."}
							type="number"
							value={(responses[question.id] as string) || ""}
						/>
					)}

					{question.type === "boolean" && (
						<OptionsGrid>
							<OptionButton
								isDisabled={!isActive || allAnswered}
								isSelected={responses[question.id] === "true"}
								onClick={() => handleBooleanToggle(question.id, true)}>
								<span style={{ flex: 1 }}>Yes</span>
							</OptionButton>
							<OptionButton
								isDisabled={!isActive || allAnswered}
								isSelected={responses[question.id] === "false"}
								onClick={() => handleBooleanToggle(question.id, false)}>
								<span style={{ flex: 1 }}>No</span>
							</OptionButton>
						</OptionsGrid>
					)}
				</QuestionBlock>
			))}

			{isActive && !allAnswered && (
				<SubmitButton isDisabled={!canSubmit} onClick={handleSubmit}>
					{isSubmitting ? "Submitting..." : "Submit Answers"}
				</SubmitButton>
			)}
		</QuestionsContainer>
	)
}
