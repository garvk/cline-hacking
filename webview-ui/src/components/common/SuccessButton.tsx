import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"

interface SuccessButtonTWProps extends React.ComponentProps<typeof VSCodeButton> {}

const SuccessButtonTW: React.FC<SuccessButtonTWProps> = (props) => {
	return (
		<VSCodeButton
			{...props}
			className={`
				!bg-[var(--color-success)] 
				!border-[var(--color-success)] 
				!text-white
				hover:!bg-[var(--color-success-hover)] 
				hover:!border-[var(--color-success-hover)]
				active:!bg-[var(--color-success-active)] 
				active:!border-[var(--color-success-active)]
				${props.className || ""}
			`
				.replace(/\s+/g, " ")
				.trim()}
		/>
	)
}

export default SuccessButtonTW
