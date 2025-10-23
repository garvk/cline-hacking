#!/usr/bin/env node

/**
 * Hybrid Build Script for Chrome Extension
 *
 * This script builds the Chrome extension using:
 * - Vite: For the React app (webview-ui) - same build as web/standalone
 * - Copy: For extension scripts (background, content, sidepanel bridge)
 *
 * This ensures UI consistency across Web, VS Code, and Chrome Extension.
 */

import { execSync } from "child_process"
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, "..")
const distDir = join(rootDir, "dist-extension")
const webviewBuildDir = join(rootDir, "webview-ui", "build")

console.log("🔧 Building Chrome Extension (Hybrid Approach)")
console.log("   Using Vite for React app, copying extension scripts\n")

// Step 1: Clean dist-extension directory
console.log("1️⃣  Cleaning dist-extension directory...")
if (existsSync(distDir)) {
	rmSync(distDir, { recursive: true, force: true })
}
mkdirSync(distDir, { recursive: true })
console.log("   ✅ Cleaned\n")

// Step 2: Build React app with Vite (PLATFORM=chrome-extension)
console.log("2️⃣  Building React app with Vite (PLATFORM=chrome-extension)...")
try {
	execSync("cd webview-ui && PLATFORM=chrome-extension npm run build", {
		stdio: "inherit",
		cwd: rootDir,
	})
	console.log("   ✅ React app built\n")
} catch (error) {
	console.error("   ❌ Failed to build React app")
	process.exit(1)
}

// Step 3: Copy Vite build to dist-extension/webview
console.log("3️⃣  Copying Vite build to dist-extension/webview...")
const webviewDistDir = join(distDir, "webview")
mkdirSync(webviewDistDir, { recursive: true })

function copyRecursive(src, dest) {
	if (!existsSync(src)) {
		console.warn(`   ⚠️  Source not found: ${src}`)
		return
	}

	const stat = statSync(src)

	if (stat.isDirectory()) {
		mkdirSync(dest, { recursive: true })
		const files = readdirSync(src)
		for (const file of files) {
			copyRecursive(join(src, file), join(dest, file))
		}
	} else {
		copyFileSync(src, dest)
	}
}

copyRecursive(webviewBuildDir, webviewDistDir)
console.log("   ✅ Vite build copied\n")

// Step 4: Copy extension scripts (background, content, sidepanel)
console.log("4️⃣  Copying extension scripts...")

// Background scripts
const backgroundSrcDir = join(rootDir, "chrome-extension", "background")
const backgroundDistDir = join(distDir, "background")
mkdirSync(backgroundDistDir, { recursive: true })
copyRecursive(backgroundSrcDir, backgroundDistDir)
console.log("   ✅ Background scripts copied")

// Content scripts
const contentSrcDir = join(rootDir, "chrome-extension", "content")
const contentDistDir = join(distDir, "content")
if (existsSync(contentSrcDir)) {
	mkdirSync(contentDistDir, { recursive: true })
	copyRecursive(contentSrcDir, contentDistDir)
	console.log("   ✅ Content scripts copied")
}

// Sidepanel scripts
const sidepanelSrcDir = join(rootDir, "chrome-extension", "sidepanel")
const sidepanelDistDir = join(distDir, "sidepanel")
mkdirSync(sidepanelDistDir, { recursive: true })

// Copy sidepanel.js and platform-init.js
copyFileSync(join(sidepanelSrcDir, "sidepanel.js"), join(sidepanelDistDir, "sidepanel.js"))
copyFileSync(join(sidepanelSrcDir, "platform-init.js"), join(sidepanelDistDir, "platform-init.js"))
console.log("   ✅ Sidepanel scripts copied")

// Shared scripts
const sharedSrcDir = join(rootDir, "chrome-extension", "shared")
const sharedDistDir = join(distDir, "shared")
if (existsSync(sharedSrcDir)) {
	mkdirSync(sharedDistDir, { recursive: true })
	copyRecursive(sharedSrcDir, sharedDistDir)
	console.log("   ✅ Shared scripts copied")
}

console.log("")

// Step 5: Copy static assets
console.log("5️⃣  Copying static assets...")

// Copy manifest.json
copyFileSync(join(rootDir, "chrome-extension", "manifest.json"), join(distDir, "manifest.json"))
console.log("   ✅ manifest.json copied")

// Copy icons
const iconsSrcDir = join(rootDir, "chrome-extension", "assets", "icons")
const iconsDistDir = join(distDir, "assets", "icons")
if (existsSync(iconsSrcDir)) {
	mkdirSync(iconsDistDir, { recursive: true })
	copyRecursive(iconsSrcDir, iconsDistDir)
	console.log("   ✅ Icons copied")
}

// Copy other assets
const assetsSrcDir = join(rootDir, "chrome-extension", "assets")
const assetsDistDir = join(distDir, "assets")
if (existsSync(assetsSrcDir)) {
	const files = readdirSync(assetsSrcDir)
	for (const file of files) {
		if (file !== "icons") {
			const srcPath = join(assetsSrcDir, file)
			const destPath = join(assetsDistDir, file)
			const stat = statSync(srcPath)
			if (stat.isFile()) {
				mkdirSync(dirname(destPath), { recursive: true })
				copyFileSync(srcPath, destPath)
			}
		}
	}
	console.log("   ✅ Other assets copied")
}

console.log("")

// Step 6: Create sidepanel.html
console.log("6️⃣  Creating sidepanel.html...")
const sidepanelHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cline AI Assistant</title>
    
    <!-- Vite-built CSS (same as web/standalone) -->
    <link rel="stylesheet" href="../webview/assets/index.css">
    
    <!-- Chrome-specific styles for sidebar constraints -->
    <style>
        /* Ensure the app fills the sidepanel height */
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        
        /* Root container should be a flex column that fills height */
        #root {
            height: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <!-- Platform initialization for Chrome extension -->
    <script src="platform-init.js"></script>
    
    <!-- Load Vite-built React app (same as web/standalone) -->
    <script type="module" src="../webview/assets/index.js"></script>
    
    <!-- Load sidepanel controller (WebSocket bridge) -->
    <script src="sidepanel.js"></script>
</body>
</html>
`

const { writeFileSync } = await import("fs")
writeFileSync(join(sidepanelDistDir, "sidepanel.html"), sidepanelHtml)
console.log("   ✅ sidepanel.html created\n")

// Done!
console.log("✅ Chrome Extension build complete!")
console.log(`   Output directory: ${distDir}`)
console.log(`   React app (Vite): ${join(distDir, "webview")}`)
console.log(`   Extension scripts: ${join(distDir, "background")}, ${join(distDir, "sidepanel")}`)
console.log("")
console.log("📦 To package the extension:")
console.log("   cd dist-extension && zip -r ../cline-chrome-extension.zip .")
console.log("")
console.log("🚀 To load in Chrome:")
console.log("   1. Open chrome://extensions/")
console.log('   2. Enable "Developer mode"')
console.log('   3. Click "Load unpacked"')
console.log("   4. Select the dist-extension directory")
