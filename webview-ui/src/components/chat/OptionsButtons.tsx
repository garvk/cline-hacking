import { AskResponseRequest } from "@shared/proto/cline/task"
import styled from "styled-components"
import { TaskServiceClient } from "@/services/grpc-client"

const OptionButton = styled.button<{ isSelected?: boolean; isNotSelectable?: boolean }>`
	padding: 12px 16px;
	background: ${(props) => (props.isSelected ? "hsl(var(--primary, 221 83% 53%))" : "hsl(var(--card, 0 0% 100%))")};
	color: ${(props) => (props.isSelected ? "white" : "hsl(var(--foreground, 222 47% 11%))")};
	border: 2px solid ${(props) => (props.isSelected ? "hsl(var(--primary, 221 83% 53%))" : "hsl(var(--border, 214 32% 91%))")};
	border-radius: var(--radius-md, 12px);
	cursor: ${(props) => (props.isNotSelectable ? "default" : "pointer")};
	text-align: left;
	font-size: 14px;
	font-weight: 500;
	transition: all var(--transition-fast, 150ms);
	position: relative;
	display: flex;
	align-items: center;
	gap: 10px;
	box-shadow: ${(props) =>
		props.isSelected
			? "var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))"
			: "var(--shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1))"};
	opacity: ${(props) => (props.isNotSelectable && !props.isSelected ? 0.6 : 1)};

	${(props) =>
		!props.isNotSelectable &&
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

export const OptionsButtons = ({
	options,
	selected,
	isActive,
	inputValue,
}: {
	options?: string[]
	selected?: string
	isActive?: boolean
	inputValue?: string
}) => {
	if (!options?.length) {
		return null
	}

	const hasSelected = selected !== undefined && options.includes(selected)

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				paddingTop: 20,
			}}>
			{isActive && !hasSelected && (
				<div
					style={{
						color: "hsl(var(--muted-foreground, 215 16% 47%))",
						fontSize: "13px",
						fontWeight: 600,
						textTransform: "uppercase",
						letterSpacing: "0.05em",
						marginBottom: "4px",
					}}>
					Choose an option:
				</div>
			)}
			{options.map((option, index) => (
				<OptionButton
					className="options-button"
					id={`options-button-${index}`}
					isNotSelectable={hasSelected || !isActive}
					isSelected={option === selected}
					key={index}
					onClick={async () => {
						if (hasSelected || !isActive) {
							return
						}
						try {
							await TaskServiceClient.askResponse(
								AskResponseRequest.create({
									responseType: "messageResponse",
									text: option + (inputValue ? `: ${inputValue?.trim()}` : ""),
									images: [],
								}),
							)
						} catch (error) {
							console.error("Error sending option response:", error)
						}
					}}>
					<span className="ph-no-capture" style={{ flex: 1 }}>
						{option}
					</span>
					{isActive && !hasSelected && (
						<span
							className="codicon codicon-chevron-right"
							style={{
								fontSize: "14px",
								opacity: 0.6,
								marginLeft: "auto",
							}}
						/>
					)}
				</OptionButton>
			))}
		</div>
	)
}
