#!/usr/bin/env node
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, "..")

async function buildExtension() {
	console.log("🏗️  Building Chrome extension with Vite...")

	// Step 1: Clean dist-extension directory
	const distDir = join(projectRoot, "dist-extension")
	if (statSync(distDir, { throwIfNoEntry: false })) {
		console.log("🧹 Cleaning dist-extension directory...")
		rmSync(distDir, { recursive: true, force: true })
	}
	mkdirSync(distDir, { recursive: true })

	// Step 2: Build React app with Vite using execa to run from webview-ui directory
	console.log("📦 Building React app with Vite...")

	const { execa } = await import("execa")

	await execa("npm", ["run", "build", "--", "--config", "vite.config.extension.ts"], {
		cwd: join(projectRoot, "webview-ui"),
		stdio: "inherit",
	})

	// Step 3: Copy extension files
	console.log("📋 Copying extension files...")

	const filesToCopy = [
		{ from: "chrome-extension/manifest.json", to: "dist-extension/manifest.json" },
		{ from: "chrome-extension/sidepanel/sidepanel.html", to: "dist-extension/sidepanel/sidepanel.html" },
		{ from: "chrome-extension/sidepanel/platform-init.js", to: "dist-extension/sidepanel/platform-init.js" },
		{ from: "chrome-extension/background/background.js", to: "dist-extension/background/background.js" },
		{ from: "chrome-extension/background/backend-connector.js", to: "dist-extension/background/backend-connector.js" },
	]

	for (const file of filesToCopy) {
		const fromPath = join(projectRoot, file.from)
		const toPath = join(projectRoot, file.to)
		mkdirSync(dirname(toPath), { recursive: true })
		copyFileSync(fromPath, toPath)
		console.log(`  ✅ Copied ${file.from}`)
	}

	// Step 4: Copy icons directory
	console.log("🎨 Copying icons...")
	copyDirectorySync(join(projectRoot, "chrome-extension/assets/icons"), join(projectRoot, "dist-extension/assets/icons"))

	// Step 5: Fix Vite-built index.html for Chrome extension
	console.log("🔧 Fixing index.html for Chrome extension...")
	const indexPath = join(projectRoot, "dist-extension/sidepanel/index.html")
	let indexHtml = readFileSync(indexPath, "utf8")

	// Fix absolute paths to relative paths
	indexHtml = indexHtml.replace(/src="\/assets\//g, 'src="assets/')
	indexHtml = indexHtml.replace(/href="\/assets\//g, 'href="assets/')

	// Update title
	indexHtml = indexHtml.replace(/<title>.*?<\/title>/, "<title>Cline AI Assistant</title>")

	// Add platform-init.js and standalone-bridge.js after <div id="root"></div>
	indexHtml = indexHtml.replace(
		/<div id="root"><\/div>/,
		`<div id="root"></div>
		
		<!-- Platform initialization for Chrome extension (using standalone code path) -->
		<script src="platform-init.js"></script>
		
		<!-- Load bridge from backend (same as standalone version) -->
		<script src="http://localhost:8080/standalone-bridge.js"></script>`,
	)

	// Remove the old bridge loader script from webview-ui/index.html if present
	indexHtml = indexHtml.replace(/<script>[\s\S]*?loadStandaloneBridge[\s\S]*?<\/script>/, "")

	writeFileSync(indexPath, indexHtml)
	console.log("  ✅ Fixed index.html paths and added required scripts")

	// Step 6: Update manifest to use index.html
	console.log("🔧 Updating manifest.json...")
	const manifestPath = join(projectRoot, "dist-extension/manifest.json")
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
	manifest.side_panel.default_path = "sidepanel/index.html"
	writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t"))
	console.log("  ✅ Updated manifest to use index.html")

	console.log("\n✅ Chrome extension built successfully!")
	console.log("\n📦 Distribution files located in: dist-extension/")
	console.log("\n🚀 To test the extension:")
	console.log("   1. Open Chrome and navigate to chrome://extensions/")
	console.log("   2. Enable 'Developer mode'")
	console.log("   3. Click 'Load unpacked'")
	console.log("   4. Select the 'dist-extension/' directory")
}

function copyDirectorySync(src, dest) {
	mkdirSync(dest, { recursive: true })
	const entries = readdirSync(src, { withFileTypes: true })

	for (const entry of entries) {
		const srcPath = join(src, entry.name)
		const destPath = join(dest, entry.name)

		if (entry.isDirectory()) {
			copyDirectorySync(srcPath, destPath)
		} else {
			copyFileSync(srcPath, destPath)
			console.log(`  ✅ Copied ${srcPath.replace(projectRoot, "")}`)
		}
	}
}

buildExtension().catch((error) => {
	console.error("❌ Build failed:", error)
	process.exit(1)
})
