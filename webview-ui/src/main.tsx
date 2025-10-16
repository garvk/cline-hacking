import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { PLATFORM_CONFIG, PlatformType } from "./config/platform.config"

const platformName = PLATFORM_CONFIG.type === PlatformType.STANDALONE ? "standalone" : "vscode"
document.documentElement.setAttribute("data-platform", platformName)

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
