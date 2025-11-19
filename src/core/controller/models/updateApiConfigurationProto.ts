import { buildApiHandler } from "@core/api"
import { Empty } from "@shared/proto/cline/common"
import { UpdateApiConfigurationRequest } from "@shared/proto/cline/models"
import { convertProtoToApiConfiguration } from "@shared/proto-conversions/models/api-configuration-conversion"
import type { Controller } from "../index"

/**
 * Updates API configuration
 * @param controller The controller instance
 * @param request The update API configuration request
 * @returns Empty response
 */
export async function updateApiConfigurationProto(
	controller: Controller,
	request: UpdateApiConfigurationRequest,
): Promise<Empty> {
	try {
		console.log("[APICONFIG:UPDATE] ========== UPDATE REQUEST RECEIVED ==========")

		if (!request.apiConfiguration) {
			console.log("[APICONFIG:UPDATE] ERROR: API configuration is required")
			throw new Error("API configuration is required")
		}

		console.log("[APICONFIG:UPDATE] Proto config received:", {
			planModeApiProvider: request.apiConfiguration.planModeApiProvider,
			actModeApiProvider: request.apiConfiguration.actModeApiProvider,
			planModeApiModelId: request.apiConfiguration.planModeApiModelId,
			actModeApiModelId: request.apiConfiguration.actModeApiModelId,
		})

		// Convert proto ApiConfiguration to application ApiConfiguration
		const appApiConfiguration = convertProtoToApiConfiguration(request.apiConfiguration)

		console.log("[APICONFIG:UPDATE] Converted to app config:", {
			planModeApiProvider: appApiConfiguration.planModeApiProvider,
			actModeApiProvider: appApiConfiguration.actModeApiProvider,
			planModeApiModelId: appApiConfiguration.planModeApiModelId,
			actModeApiModelId: appApiConfiguration.actModeApiModelId,
		})

		// Update the API configuration in storage
		console.log("[APICONFIG:UPDATE] Calling stateManager.setApiConfiguration...")
		controller.stateManager.setApiConfiguration(appApiConfiguration)
		console.log("[APICONFIG:UPDATE] ✓ setApiConfiguration completed")

		// Update the task's API handler if there's an active task
		if (controller.task) {
			const currentMode = controller.stateManager.getGlobalSettingsKey("mode")
			controller.task.api = buildApiHandler({ ...appApiConfiguration, ulid: controller.task.ulid }, currentMode)
			console.log("[APICONFIG:UPDATE] ✓ Task API handler updated for mode:", currentMode)
		}

		// Post updated state to webview
		console.log("[APICONFIG:UPDATE] Posting updated state to webview...")
		await controller.postStateToWebview()
		console.log("[APICONFIG:UPDATE] ✓ State posted to webview")

		console.log("[APICONFIG:UPDATE] ========== UPDATE COMPLETE ==========")

		return Empty.create()
	} catch (error) {
		console.error("[APICONFIG:UPDATE] ❌ ERROR:", error)
		throw error
	}
}
