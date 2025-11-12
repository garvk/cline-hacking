import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"

interface DangerButtonProps extends React.ComponentProps<typeof VSCodeButton> {}

const DangerButton: React.FC<DangerButtonProps> = (props) => {
	return (
		<VSCodeButton
			{...props}
			className={`
				!bg-[var(--color-danger)]
				!border-[var(--color-danger)]
				!text-white
				hover:!bg-[var(--color-danger-hover)]
				hover:!border-[var(--color-danger-hover)]
				active:!bg-[var(--color-danger-active)]
				active:!border-[var(--color-danger-active)]
				${props.className || ""}
			`}
		/>
	)
}

export default DangerButton
