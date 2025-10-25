/// <reference types="vitest/config" />

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import { resolve } from "path"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [react(), tailwindcss()],

	// Build output for Chrome extension
	build: {
		outDir: "../dist-extension/sidepanel",
		emptyOutDir: false, // Keep manifest and other files

		rollupOptions: {
			input: {
				sidepanel: resolve(__dirname, "./index.html"),
			},

			output: {
				// Ensure files are named consistently
				entryFileNames: "assets/cline-app.js",
				chunkFileNames: "assets/[name].js",
				assetFileNames: "assets/[name].[ext]",
			},
		},

		// Chrome extension CSP requirements
		minify: "terser",
		sourcemap: false,

		// Inline small assets
		assetsInlineLimit: 4096,

		chunkSizeWarningLimit: 100000,
	},

	// Same resolve config as main vite.config
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
			"@components": resolve(__dirname, "./src/components"),
			"@context": resolve(__dirname, "./src/context"),
			"@utils": resolve(__dirname, "./src/utils"),
			"@shared": resolve(__dirname, "../src/shared"),
		},
	},

	// Platform constant - use standalone to share code path
	define: {
		__PLATFORM__: JSON.stringify("standalone"),
		process: JSON.stringify({
			env: {
				NODE_ENV: JSON.stringify("production"),
				CLINE_ENVIRONMENT: JSON.stringify("production"),
				IS_DEV: JSON.stringify(false),
				IS_TEST: JSON.stringify(false),
				CI: JSON.stringify(false),
			},
		}),
	},
})
