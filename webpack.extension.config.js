const path = require("path")
const webpack = require("webpack")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")

module.exports = (env, argv) => {
	const isProduction = argv.mode === "production"

	return {
		mode: isProduction ? "production" : "development",
		devtool: isProduction ? false : "cheap-module-source-map",

		entry: {
			// Background scripts
			"background/background": "./chrome-extension/background/background.js",

			// Content scripts
			"content/content": "./chrome-extension/content/content.js",

			// Side panel scripts
			"sidepanel/sidepanel": "./chrome-extension/sidepanel/sidepanel.js",

			// React app bundle for side panel
			"sidepanel/cline-app": "./webview-ui/src/main.tsx",
		},

		output: {
			path: path.resolve(__dirname, "dist-extension"),
			filename: "[name].js",
			clean: true,
		},

		resolve: {
			extensions: [".ts", ".tsx", ".js", ".jsx"],
			alias: {
				// Webview UI aliases (must match paths in tsconfig)
				"@": path.resolve(__dirname, "webview-ui/src"),
				"@components": path.resolve(__dirname, "webview-ui/src/components"),
				"@context": path.resolve(__dirname, "webview-ui/src/context"),
				"@utils": path.resolve(__dirname, "webview-ui/src/utils"),
				"@shared": path.resolve(__dirname, "src/shared"),
				// Extension-specific aliases
				"@extension": path.resolve(__dirname, "chrome-extension"),
				"@extension-shared": path.resolve(__dirname, "chrome-extension/shared"),
			},
			fallback: {
				// Node.js polyfills for browser environment
				path: require.resolve("path-browserify"),
				os: require.resolve("os-browserify/browser"),
				crypto: require.resolve("crypto-browserify"),
				stream: require.resolve("stream-browserify"),
				buffer: require.resolve("buffer"),
				process: require.resolve("process/browser.js"),
				"process/browser": require.resolve("process/browser.js"),
				util: require.resolve("util"),
				fs: false,
				net: false,
				tls: false,
				assert: require.resolve("assert"),
			},
			// Handle ESM modules properly
			fullySpecified: false,
		},

		module: {
			rules: [
				// Handle ESM .mjs files
				{
					test: /\.mjs$/,
					resolve: {
						fullySpecified: false,
					},
					type: "javascript/esm",
				},

				// TypeScript and TSX
				{
					test: /\.tsx?$/,
					use: [
						{
							loader: "ts-loader",
							options: {
								configFile: path.resolve(__dirname, "webview-ui/tsconfig.webpack.json"),
								transpileOnly: true,
							},
						},
					],
					exclude: /node_modules/,
				},

				// JavaScript and JSX
				{
					test: /\.jsx?$/,
					exclude: /node_modules/,
					resolve: {
						fullySpecified: false,
					},
					use: {
						loader: "babel-loader",
						options: {
							presets: [
								[
									"@babel/preset-env",
									{
										targets: { chrome: "88" }, // Chrome 88+ for Manifest V3
									},
								],
								"@babel/preset-react",
								"@babel/preset-typescript",
							],
							plugins: ["@babel/plugin-proposal-class-properties", "@babel/plugin-transform-runtime"],
						},
					},
				},

				// CSS files
				{
					test: /\.css$/,
					use: ["style-loader", "css-loader", "postcss-loader"],
				},

				// Images and fonts
				{
					test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
					type: "asset/resource",
					generator: {
						filename: "assets/[name].[hash][ext]",
					},
				},
			],
		},

		plugins: [
			// Clean dist directory
			new CleanWebpackPlugin(),

			// Copy static files
			new CopyWebpackPlugin({
				patterns: [
					// Copy manifest.json
					{
						from: "chrome-extension/manifest.json",
						to: "manifest.json",
					},

					// Copy side panel HTML
					{
						from: "chrome-extension/sidepanel/sidepanel.html",
						to: "sidepanel/sidepanel.html",
					},

					// Copy extension icons
					{
						from: "chrome-extension/assets/icons",
						to: "assets/icons",
					},

					// Copy any additional assets
					{
						from: "chrome-extension/assets",
						to: "assets",
						globOptions: {
							ignore: ["**/icons/**"], // Already copied above
						},
						noErrorOnMissing: true,
					},
				],
			}),

			// Define platform and other compile-time constants
			new webpack.DefinePlugin({
				__PLATFORM__: JSON.stringify("chrome-extension"),
				"process.env.NODE_ENV": JSON.stringify(isProduction ? "production" : "development"),
				"process.env.PLATFORM": JSON.stringify("chrome-extension"),
				global: "globalThis",
			}),

			// Provide Node.js globals for browser
			new webpack.ProvidePlugin({
				Buffer: ["buffer", "Buffer"],
				process: require.resolve("process/browser.js"),
			}),

			// Environment-specific optimizations
			...(isProduction
				? [
						// Skip ModuleConcatenationPlugin due to ESM issues
						// new webpack.optimize.ModuleConcatenationPlugin(),
					]
				: [
						// Development optimizations
						new webpack.HotModuleReplacementPlugin(),
					]),
		],

		optimization: {
			splitChunks: {
				chunks: "all",
				cacheGroups: {
					// Protobuf - separate chunk to avoid ESM issues
					protobuf: {
						test: /[\\/]node_modules[\\/]@bufbuild[\\/]/,
						name: "shared/protobuf",
						chunks: "all",
						enforce: true,
					},

					// Mermaid - separate chunk to avoid ESM issues
					mermaid: {
						test: /[\\/]node_modules[\\/]mermaid[\\/]|[\\/]node_modules[\\/]@mermaid-js[\\/]/,
						name: "shared/mermaid",
						chunks: "all",
						enforce: true,
					},

					// React specific
					react: {
						test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
						name: "shared/react",
						chunks: "all",
						enforce: true,
					},

					// Vendor libraries (general node_modules, lower priority)
					vendor: {
						test: /[\\/]node_modules[\\/]/,
						name: "shared/vendor",
						chunks: "all",
						priority: 1,
					},

					// Shared extension utilities
					shared: {
						test: /[\\/]chrome-extension[\\/]shared[\\/]/,
						name: "shared/extension-utils",
						chunks: "all",
						enforce: true,
					},
				},
			},

			minimize: isProduction,

			// Prevent webpack from adding runtime code that breaks extension
			runtimeChunk: false,

			// Additional settings for ESM compatibility
			concatenateModules: false,
			providedExports: false,
			usedExports: false,
		},

		// Extension-specific configurations
		target: "web",

		// Disable Node.js specific features
		node: false,

		// Development server (not used for extensions, but good to have)
		devServer: {
			contentBase: path.join(__dirname, "dist-extension"),
			compress: true,
			port: 9000,
			hot: false,
			inline: false,
		},

		// Performance hints
		performance: {
			hints: isProduction ? "warning" : false,
			maxAssetSize: 1000000, // 1MB
			maxEntrypointSize: 1000000, // 1MB
		},

		// Stats configuration
		stats: {
			colors: true,
			modules: false,
			children: false,
			chunks: false,
			chunkModules: false,
			entrypoints: false,
		},
	}
}
