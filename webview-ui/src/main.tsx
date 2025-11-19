import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { PLATFORM_CONFIG, PlatformType } from "./config/platform.config"
import { promptConfigLoader } from "./services/prompt-config-loader"

const platformName =
	PLATFORM_CONFIG.type === PlatformType.STANDALONE
		? "standalone"
		: PLATFORM_CONFIG.type === PlatformType.CHROME_EXTENSION
			? "chrome-extension"
			: "vscode"
document.documentElement.setAttribute("data-platform", platformName)

// Initialize prompt configurations on startup
promptConfigLoader.loadConfigurations().then((configs) => {
	console.log("Prompt configurations loaded:", Object.keys(configs.configurations))
	const currentConfig = promptConfigLoader.getCurrentConfigurationKey()
	console.log("Current prompt configuration:", currentConfig)
})

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
