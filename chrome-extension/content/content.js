// Content Script - Webpage Interaction Controller
// Enables Cline to read, interact with, and manipulate web pages

class WebpageController {
	constructor() {
		this.highlightedElements = new Set()
		this.highlightStyle = null
		this.setupMessageListener()
		this.injectHighlightStyles()
		this.initialize()
	}

	initialize() {
		console.log("[Content] Webpage controller initialized on:", window.location.href)

		// Notify background script that content script is ready
		chrome.runtime
			.sendMessage({
				type: "CONTENT_SCRIPT_READY",
				data: {
					url: window.location.href,
					title: document.title,
				},
			})
			.catch(() => {
				// Extension context might not be available, ignore
			})
	}

	setupMessageListener() {
		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			this.handleAction(request, sendResponse)
			return true // Keep async channel open
		})
	}

	injectHighlightStyles() {
		// Create stylesheet for element highlighting
		this.highlightStyle = document.createElement("style")
		this.highlightStyle.textContent = `
      .cline-highlight {
        outline: 3px solid #007acc !important;
        outline-offset: 2px !important;
        background-color: rgba(0, 122, 204, 0.1) !important;
        transition: all 0.3s ease !important;
        animation: cline-pulse 1s ease-in-out !important;
      }
      
      .cline-highlight-flash {
        outline: 3px solid #28a745 !important;
        outline-offset: 2px !important;
        background-color: rgba(40, 167, 69, 0.2) !important;
        animation: cline-flash 0.5s ease-in-out !important;
      }
      
      @keyframes cline-pulse {
        0%, 100% { outline-color: #007acc; }
        50% { outline-color: #4fc3f7; }
      }
      
      @keyframes cline-flash {
        0%, 100% { background-color: rgba(40, 167, 69, 0.2); }
        50% { background-color: rgba(40, 167, 69, 0.4); }
      }
      
      .cline-page-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.1);
        z-index: 9999;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
    `
		document.head.appendChild(this.highlightStyle)
	}

	async handleAction(request, sendResponse) {
		try {
			console.log("[Content] Handling action:", request.action)

			switch (request.action) {
				case "READ_PAGE":
					sendResponse(await this.readPage())
					break
				case "CLICK_ELEMENT":
					sendResponse(await this.clickElement(request.selector))
					break
				case "FILL_FORM_FIELD":
					sendResponse(await this.fillFormField(request.selector, request.value))
					break
				case "EXTRACT_DATA":
					sendResponse(await this.extractData(request.selectors))
					break
				case "SCROLL_TO":
					sendResponse(await this.scrollTo(request.target))
					break
				case "NAVIGATE_PAGE":
					sendResponse(await this.navigatePage(request.direction))
					break
				case "HIGHLIGHT_ELEMENTS":
					sendResponse(await this.highlightElements(request.selectors))
					break
				case "CLEAR_HIGHLIGHTS":
					sendResponse(await this.clearHighlights())
					break
				case "GET_PAGE_STRUCTURE":
					sendResponse(await this.getPageStructure())
					break
				case "SIMULATE_USER_ACTION":
					sendResponse(await this.simulateUserAction(request.actionType, request.params))
					break
				default:
					sendResponse({
						success: false,
						error: `Unknown action: ${request.action}`,
					})
			}
		} catch (error) {
			console.error("[Content] Error handling action:", error)
			sendResponse({
				success: false,
				error: error.message,
				stack: error.stack,
			})
		}
	}

	async readPage() {
		console.log("[Content] Reading page content...")

		return {
			success: true,
			data: {
				// Basic page info
				title: document.title,
				url: window.location.href,
				domain: window.location.hostname,

				// Page content
				text: this.extractCleanText(),
				headings: this.extractHeadings(),
				links: this.extractLinks(),
				images: this.extractImages(),

				// Interactive elements
				forms: this.analyzeForms(),
				buttons: this.findButtons(),
				inputs: this.findInputs(),
				clickableElements: this.findClickableElements(),

				// Page structure
				structure: this.analyzePageStructure(),

				// Viewport info
				viewport: {
					width: window.innerWidth,
					height: window.innerHeight,
					scrollY: window.scrollY,
					scrollHeight: document.body.scrollHeight,
					scrollWidth: document.body.scrollWidth,
				},

				// Meta information
				meta: this.extractMetaInfo(),

				// Accessibility info
				accessibility: this.analyzeAccessibility(),
			},
		}
	}

	async clickElement(selector) {
		const element = document.querySelector(selector)
		if (!element) {
			return {
				success: false,
				error: `Element not found: ${selector}`,
			}
		}

		// Scroll into view
		element.scrollIntoView({
			behavior: "smooth",
			block: "center",
			inline: "center",
		})

		// Wait for scroll to complete
		await this.sleep(500)

		// Highlight before clicking
		this.flashHighlight(element)

		// Check if element is clickable
		const rect = element.getBoundingClientRect()
		if (rect.width === 0 || rect.height === 0) {
			return {
				success: false,
				error: "Element is not visible or has no dimensions",
			}
		}

		// Simulate mouse events for better compatibility
		element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
		await this.sleep(100)

		// Perform the click
		element.click()

		// Also dispatch click event manually for better compatibility
		element.dispatchEvent(
			new MouseEvent("click", {
				bubbles: true,
				cancelable: true,
				view: window,
			}),
		)

		// Wait for potential page changes
		await this.sleep(1000)

		return {
			success: true,
			element: {
				tag: element.tagName.toLowerCase(),
				text: element.textContent?.trim() || "",
				attributes: this.getElementAttributes(element),
			},
			page: {
				url: window.location.href,
				title: document.title,
			},
		}
	}

	async fillFormField(selector, value) {
		const element = document.querySelector(selector)
		if (!element) {
			return {
				success: false,
				error: `Field not found: ${selector}`,
			}
		}

		// Scroll into view
		element.scrollIntoView({
			behavior: "smooth",
			block: "center",
		})
		await this.sleep(300)

		// Focus the element
		element.focus()

		// Clear existing value
		if (element.value !== undefined) {
			element.select()
		}

		// Set the value
		if (element.tagName.toLowerCase() === "select") {
			// Handle select elements
			const option = Array.from(element.options).find((opt) => opt.value === value || opt.text === value)
			if (option) {
				option.selected = true
				element.value = option.value
			} else {
				return {
					success: false,
					error: `Option not found in select: ${value}`,
				}
			}
		} else if (element.type === "checkbox" || element.type === "radio") {
			// Handle checkboxes and radio buttons
			const shouldCheck = value === true || value === "true" || value === "on" || value === "1"
			element.checked = shouldCheck
		} else {
			// Handle text inputs, textareas, etc.
			element.value = value
		}

		// Trigger events
		element.dispatchEvent(new Event("input", { bubbles: true }))
		element.dispatchEvent(new Event("change", { bubbles: true }))

		// Highlight the field
		this.flashHighlight(element)

		return {
			success: true,
			element: {
				tag: element.tagName.toLowerCase(),
				type: element.type,
				value: element.value,
				checked: element.checked,
			},
		}
	}

	async scrollTo(target) {
		const scrollOptions = { behavior: "smooth" }

		if (typeof target === "string") {
			if (target === "top") {
				scrollOptions.top = 0
			} else if (target === "bottom") {
				scrollOptions.top = document.body.scrollHeight
			} else {
				// Try to find element by selector
				const element = document.querySelector(target)
				if (element) {
					element.scrollIntoView(scrollOptions)
					await this.sleep(1000)
					return {
						success: true,
						scrollY: window.scrollY,
						target: "element",
					}
				} else {
					return {
						success: false,
						error: `Element not found: ${target}`,
					}
				}
			}
		} else if (typeof target === "object") {
			// Scroll to coordinates
			scrollOptions.top = target.y || 0
			scrollOptions.left = target.x || 0
		}

		window.scrollTo(scrollOptions)
		await this.sleep(1000)

		return {
			success: true,
			scrollY: window.scrollY,
			scrollX: window.scrollX,
			scrollHeight: document.body.scrollHeight,
		}
	}

	async extractData(selectors) {
		const results = {}

		for (const [key, selector] of Object.entries(selectors)) {
			try {
				const elements = document.querySelectorAll(selector)
				results[key] = Array.from(elements).map((el) => ({
					text: el.textContent?.trim() || "",
					html: el.innerHTML,
					attributes: this.getElementAttributes(el),
					bounds: el.getBoundingClientRect(),
				}))
			} catch (error) {
				results[key] = { error: error.message }
			}
		}

		return {
			success: true,
			data: results,
		}
	}

	// Utility methods

	extractCleanText() {
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
			acceptNode: (node) => {
				const parent = node.parentElement
				if (!parent) return NodeFilter.FILTER_REJECT

				const style = window.getComputedStyle(parent)
				if (style.display === "none" || style.visibility === "hidden") {
					return NodeFilter.FILTER_REJECT
				}

				if (parent.closest("script, style, noscript")) {
					return NodeFilter.FILTER_REJECT
				}

				return NodeFilter.FILTER_ACCEPT
			},
		})

		let text = ""
		let node
		while ((node = walker.nextNode())) {
			text += node.textContent + " "
		}

		return text.replace(/\s+/g, " ").trim()
	}

	extractHeadings() {
		const headings = []
		document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
			headings.push({
				level: parseInt(heading.tagName.charAt(1)),
				text: heading.textContent?.trim() || "",
				id: heading.id || "",
				selector: this.generateSelector(heading),
			})
		})
		return headings
	}

	extractLinks() {
		const links = []
		document.querySelectorAll("a[href]").forEach((link) => {
			links.push({
				text: link.textContent?.trim() || "",
				href: link.href,
				title: link.title || "",
				selector: this.generateSelector(link),
			})
		})
		return links
	}

	findButtons() {
		const buttons = []
		document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]').forEach((btn) => {
			buttons.push({
				text: btn.textContent?.trim() || btn.value || "",
				type: btn.type || "button",
				disabled: btn.disabled,
				selector: this.generateSelector(btn),
			})
		})
		return buttons
	}

	analyzeForms() {
		const forms = []
		document.querySelectorAll("form").forEach((form) => {
			const fields = []
			form.querySelectorAll("input, textarea, select").forEach((field) => {
				fields.push({
					name: field.name || "",
					type: field.type || "text",
					placeholder: field.placeholder || "",
					required: field.required,
					value: field.value || "",
					selector: this.generateSelector(field),
				})
			})

			forms.push({
				action: form.action || "",
				method: form.method || "get",
				fields: fields,
				selector: this.generateSelector(form),
			})
		})
		return forms
	}

	flashHighlight(element) {
		element.classList.add("cline-highlight-flash")
		setTimeout(() => {
			element.classList.remove("cline-highlight-flash")
		}, 1000)
	}

	generateSelector(element) {
		if (element.id) {
			return `#${element.id}`
		}

		if (element.className && typeof element.className === "string") {
			const classes = element.className.trim().split(/\s+/).join(".")
			if (classes) {
				return `.${classes}`
			}
		}

		// Generate path selector
		const path = []
		let current = element
		while (current && current !== document.body) {
			let selector = current.tagName.toLowerCase()
			if (current.parentElement) {
				const siblings = Array.from(current.parentElement.children)
				const sameTag = siblings.filter((el) => el.tagName === current.tagName)
				if (sameTag.length > 1) {
					const index = sameTag.indexOf(current) + 1
					selector += `:nth-of-type(${index})`
				}
			}
			path.unshift(selector)
			current = current.parentElement
		}

		return path.join(" > ")
	}

	getElementAttributes(element) {
		const attrs = {}
		for (const attr of element.attributes) {
			attrs[attr.name] = attr.value
		}
		return attrs
	}

	sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	// Additional utility methods for comprehensive page analysis
	analyzePageStructure() {
		return {
			hasNavigation: !!document.querySelector('nav, [role="navigation"]'),
			hasHeader: !!document.querySelector('header, [role="banner"]'),
			hasFooter: !!document.querySelector('footer, [role="contentinfo"]'),
			hasMain: !!document.querySelector('main, [role="main"]'),
			hasSidebar: !!document.querySelector('aside, [role="complementary"]'),
			formCount: document.querySelectorAll("form").length,
			imageCount: document.querySelectorAll("img").length,
			linkCount: document.querySelectorAll("a[href]").length,
		}
	}

	extractMetaInfo() {
		const meta = {}
		document.querySelectorAll("meta").forEach((tag) => {
			const name = tag.name || tag.property || tag.getAttribute("http-equiv")
			const content = tag.content
			if (name && content) {
				meta[name] = content
			}
		})
		return meta
	}

	analyzeAccessibility() {
		return {
			hasAriaLabels: document.querySelectorAll("[aria-label]").length,
			hasAltTexts: document.querySelectorAll("img[alt]").length,
			totalImages: document.querySelectorAll("img").length,
			hasSkipLinks: !!document.querySelector('a[href^="#"]:first-child'),
			focusableElements: document.querySelectorAll("a, button, input, textarea, select, [tabindex]").length,
		}
	}

	findClickableElements() {
		const clickable = []
		const selectors = 'a, button, input[type="button"], input[type="submit"], [onclick], [role="button"], [tabindex="0"]'

		document.querySelectorAll(selectors).forEach((el) => {
			const rect = el.getBoundingClientRect()
			if (rect.width > 0 && rect.height > 0) {
				clickable.push({
					text: el.textContent?.trim() || el.value || el.alt || "",
					tag: el.tagName.toLowerCase(),
					type: el.type || "",
					selector: this.generateSelector(el),
					bounds: {
						x: rect.x,
						y: rect.y,
						width: rect.width,
						height: rect.height,
					},
				})
			}
		})

		return clickable
	}
}

// Initialize webpage controller
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		window.webpageController = new WebpageController()
	})
} else {
	window.webpageController = new WebpageController()
}
