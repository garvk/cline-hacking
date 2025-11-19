# Cline WebView UI - Design System Reference Guide

This document contains all the technical CSS styles, themes, and fonts used in the Cline WebView UI. Use this as a complete reference to understand the design system or replicate it in another project.

---

## 🎨 Design Philosophy

### Dual-Mode Design System

Cline's WebView UI supports **two distinct rendering modes**:

1. **VSCode Extension Mode** - Integrates seamlessly with VS Code's native theming
2. **Standalone Mode** - Apple-inspired modern design with custom theming

### Core Principles

- **Theme-Aware**: Automatically adapts to light/dark mode
- **Monospace Typography**: Technical, code-focused aesthetic
- **Semantic Colors**: Uses HSL format for easy manipulation
- **Smooth Transitions**: Apple-inspired animations
- **Accessibility**: Focus states and ARIA-compliant
- **Modular**: CSS variables for easy customization

---

## 📝 Typography

### Primary Font Stack

```css
--font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
--font-family-mono: "JetBrains Mono", "Fira Code", "Courier New", monospace;
```

**Primary Font**: Inter (modern, highly readable sans-serif)
**Code Font**: JetBrains Mono (designed for developers)
**Fallback**: System fonts (Apple, Windows, cross-platform)

### Font Import

```css
/* Modern fonts for standalone platform */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap");

/* Azeret Mono as alternative */
@import url("../node_modules/@fontsource/azeret-mono/index.css");
```

### Font Sizes

```css
/* Standalone Mode */
--font-size: 0.9375rem;     /* Base: 15px (more comfortable) */
--font-size-sm: 0.875rem;   /* Small: 14px */
--font-size-lg: 1rem;       /* Large: 16px */

/* Tailwind Extensions (relative to VSCode font size) */
xl: "calc(2 * var(--vscode-font-size))"
lg: "calc(1.5 * var(--vscode-font-size))"
md: "calc(1.25 * var(--vscode-font-size))"
sm: "var(--vscode-font-size)"
xs: "calc(0.85 * var(--vscode-font-size))"
xxs: "calc(0.75 * var(--vscode-font-size))"
```

### Typography Settings

```css
--line-height: 1.6;        /* More comfortable reading */
--letter-spacing: -0.011em; /* Tighter, modern look */
font-weight: 400;  /* Regular */
font-weight: 500;  /* Medium for buttons */
font-weight: 600;  /* Semi-bold for emphasis */
font-weight: 700;  /* Bold for strong emphasis */

/* Font smoothing */
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### Font Usage

```css
/* Body text - Inter */
body, p, span, label, li {
  font-family: var(--font-family);
}

/* Code elements - JetBrains Mono */
code, pre, .code {
  font-family: var(--font-family-mono);
}

/* Headings - Inter with better hierarchy */
h1, h2, h3 {
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
}
```

---

## 🎨 Color System

### Standalone Mode - Light Theme

```css
:root[data-platform="standalone"] {
  /* Backgrounds & Surfaces - Soft blue-tinted greys */
  --background: 220 26% 97%;     /* Soft blue-white */
  --foreground: 222 47% 11%;     /* Dark slate */
  --card: 0 0% 100%;             /* Pure white cards */
  --card-foreground: 222 47% 11%; /* Dark slate */
  --popover: 0 0% 100%;          /* Pure white */
  --popover-foreground: 222 47% 11%; /* Dark slate */
  
  /* Primary Actions - Vibrant blue */
  --primary: 221 83% 53%;        /* Rich blue #4F7AFF */
  --primary-foreground: 0 0% 100%; /* White */
  
  /* Secondary Elements - Cool greys */
  --secondary: 210 40% 96%;      /* Light blue-grey */
  --secondary-foreground: 222 47% 11%; /* Dark slate */
  
  /* Muted/Subtle - Professional greys */
  --muted: 210 40% 96%;          /* Light blue-grey */
  --muted-foreground: 215 16% 47%; /* Medium grey */
  
  /* Accent/Hover States - Interactive */
  --accent: 210 40% 94%;         /* Soft blue-grey */
  --accent-foreground: 222 47% 11%; /* Dark slate */
  
  /* Status Colors */
  --status-active: 142 71% 45%;  /* Green */
  
  /* Destructive Actions - Modern red */
  --destructive: 0 84% 60%;      /* Vibrant red #F56565 */
  --destructive-foreground: 0 0% 100%; /* White */
  
  /* Borders & Inputs - Subtle definition */
  --border: 214 32% 91%;         /* Soft blue border */
  --border-strong: 215 25% 70%;  /* Defined border */
  --input: 214 32% 97%;          /* Very light input */
  --ring: 221 83% 53%;           /* Blue focus ring */
}
```

### Standalone Mode - Dark Theme

```css
:root[data-platform="standalone"].dark {
  /* Backgrounds & Surfaces - Rich, deep slate */
  --background: 222 47% 11%;     /* Dark slate #141B2D */
  --foreground: 210 40% 98%;     /* Soft white */
  --card: 217 33% 17%;           /* Elevated slate */
  --card-foreground: 210 40% 98%; /* Soft white */
  --popover: 217 33% 17%;        /* Elevated slate */
  --popover-foreground: 210 40% 98%; /* Soft white */
  
  /* Primary Actions - Bright blue for visibility */
  --primary: 217 91% 60%;        /* Bright blue #5B9EFF */
  --primary-foreground: 222 47% 11%; /* Dark slate */
  
  /* Secondary Elements - Deep slate */
  --secondary: 217 33% 17%;      /* Same as card */
  --secondary-foreground: 210 40% 98%; /* Soft white */
  
  /* Muted/Subtle - Dark slate */
  --muted: 215 28% 17%;          /* Dark muted */
  --muted-foreground: 217 10% 65%; /* Medium grey */
  
  /* Accent/Hover States - Lighter slate */
  --accent: 216 34% 27%;         /* Interactive slate */
  --accent-foreground: 210 40% 98%; /* Soft white */
  
  /* Status Colors */
  --status-active: 142 71% 45%;  /* Green (same) */
  
  /* Destructive Actions - Vibrant red */
  --destructive: 0 84% 60%;      /* Bright red */
  --destructive-foreground: 0 0% 100%; /* White */
  
  /* Borders & Inputs - Defined in dark */
  --border: 217 33% 24%;         /* Slate border */
  --border-strong: 217 33% 32%;  /* Stronger slate */
  --input: 217 33% 15%;          /* Deep input */
  --ring: 217 91% 60%;           /* Bright blue ring */
}
```

### Semantic Colors (Shared)

```css
/* Timeline and Tooltip Colors */
--color-timeline-white: #E5E5E5;
--color-timeline-gray: #8B949E;
--color-timeline-dark-gray: #6E7681;
--color-timeline-beige: #F0C674;
--color-timeline-blue: #58A6FF;
--color-timeline-red: #F85149;
--color-timeline-purple: #BC8CFF;
--color-timeline-green: #56D364;

/* Button Colors */
--color-danger: #c42b2b;
--color-danger-hover: #a82424;
--color-danger-active: #8f1f1f;
--color-success: #176f2c;
--color-success-hover: #197f31;
--color-success-active: #156528;

/* Code Block Colors */
--color-code-error: #f78383;
--color-code-bg: rgb(30 30 30);
--color-code-fg: #fff;

/* Animation Colors */
--color-gradient-purple: #9d57fa;
--color-gradient-cyan: #57c7fa;
--color-gradient-pink: #fa57a8;
```

### VSCode Theme Variables

The extension automatically maps to VSCode's theme colors:

```css
/* Example mappings (both light and dark) */
--vscode-editor-background
--vscode-editor-foreground
--vscode-button-background
--vscode-button-foreground
--vscode-input-background
--vscode-focusBorder
--vscode-errorForeground
--vscode-list-activeSelectionBackground
/* ...and 40+ more */
```

---

## 📐 Design Tokens

### Spacing System (4px base grid)

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 24px;
--spacing-2xl: 32px;
```

### Border Radius (Rounded, Apple-style)

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-full: 9999px;
```

### Shadows (Subtle Depth)

**Light Mode:**
```css
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

**Dark Mode (more pronounced):**
```css
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.3);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.4);
```

### Blur Effects

```css
--blur-sm: 8px;
--blur-md: 12px;
--blur-lg: 16px;
```

### Transitions

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 🛠️ Tailwind Configuration

### Complete tailwind.config.mjs

```javascript
import { heroui } from "@heroui/react"

export default {
  content: {
    relative: true,
    files: [
      "./src/**/*.{jsx,tsx,mdx}",
      "./node_modules/@heroui/theme/dist/**/*.{ts,tsx}"
    ],
  },
  theme: {
    extend: {
      fontFamily: {
        "azeret-mono": ['"Azeret Mono"', "monospace"],
      },
      screens: {
        "chrome-sidebar": "350px",
      },
      spacing: {
        "chrome-safe": "12px",
      },
      colors: {
        background: "var(--vscode-editor-background)",
        foreground: "var(--vscode-foreground)",
        border: {
          DEFAULT: "var(--vscode-focusBorder)",
          panel: "var(--vscode-panel-border)",
        },
        // ...see full config in code
      },
      fontSize: {
        xl: "calc(2 * var(--vscode-font-size))",
        lg: "calc(1.5 * var(--vscode-font-size))",
        md: "calc(1.25 * var(--vscode-font-size))",
        sm: "var(--vscode-font-size)",
        xs: "calc(0.85 * var(--vscode-font-size))",
        xxs: "calc(0.75 * var(--vscode-font-size))",
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
}
```

### Key Tailwind Extensions

**Responsive Breakpoints:**
- `chrome-sidebar: 350px` - Chrome extension sidebar width

**Custom Spacing:**
- `chrome-safe: 12px` - Safe margin for Chrome UI

**Dynamic Font Sizes:**
All font sizes are calculated relative to `--vscode-font-size`

**VSCode Color Integration:**
All Tailwind color utilities map to VSCode theme variables

---

## 🎯 Utility Classes

### Card/Panel Styles

```css
/* Elevated card with accent bar */
.card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

/* Accent bar appears on hover */
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6));
  opacity: 0;
  transition: opacity var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: hsl(var(--primary) / 0.2);
}

.card:hover::before {
  opacity: 1;
}
```

### Frosted Glass Effect

```css
.glass {
  backdrop-filter: blur(var(--blur-md));
  background-color: hsl(var(--card) / 0.7);
  border: 1px solid hsl(var(--border) / 0.5);
}
```

### Border Utilities

```css
.subtle-border {
  border: 1px solid hsl(var(--border));
}

.strong-border {
  border: 1px solid hsl(var(--border-strong));
}
```

### Elevation

```css
.elevated {
  box-shadow: var(--shadow-lg);
}
```

### Scrollbar Styles

```css
.scrollable::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-color: inherit;
  border-right-style: inset;
  border-right-width: calc(100vw + 100vh);
}

.scrollable::-webkit-scrollbar-thumb:hover {
  border-color: var(--vscode-scrollbarSlider-hoverBackground);
}
```

### Code Block Scrollbar

```css
.code-block-scrollable::-webkit-scrollbar-thumb {
  background-color: var(--vscode-scrollbarSlider-background);
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
  background-clip: content-box;
}
```

---

## 📦 Component Patterns

### Button Styles

```css
/* Base button */
button {
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  font-weight: 500;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--shadow-xs);
}
```

### Input Fields

```css
input, textarea, select {
  border-radius: var(--radius-sm);
  border: 1px solid hsl(var(--border));
  background-color: hsl(var(--input));
  transition: border-color var(--transition-fast),
              box-shadow var(--transition-fast);
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 3px hsl(var(--ring) / 0.1);
}
```

### Modal/Overlay

```css
.modal, .overlay {
  backdrop-filter: blur(var(--blur-md));
  background-color: hsl(var(--background) / 0.8);
}
```

### Dropdown Container

```css
.dropdown-container {
  box-sizing: border-box;
  display: flex;
  flex-flow: column nowrap;
  align-items: flex-start;
  justify-content: flex-start;
}

.dropdown-container label {
  display: block;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: var(--vscode-font-size);
  line-height: normal;
  margin-bottom: 2px;
}
```

---

## 🎨 Special Effects

### Context Mention Highlighting

```css
.mention-context-highlight {
  background-color: color-mix(
    in srgb,
    var(--vscode-badge-foreground) 30%,
    transparent
  );
  border-radius: 3px;
}

.mention-context-highlight-with-shadow {
  background-color: color-mix(
    in srgb,
    var(--vscode-badge-foreground) 30%,
    transparent
  );
  border-radius: 3px;
  box-shadow: 0 0 0 0.5px color-mix(
    in srgb,
    var(--vscode-badge-foreground) 30%,
    transparent
  );
}
```

### Slash Command Highlighting

```css
.slash-command-match-textarea-highlight {
  background-color: color-mix(
    in srgb,
    var(--vscode-focusBorder) 30%,
    transparent
  );
  border-radius: 3px;
  box-shadow: 0 0 0 0.5px color-mix(
    in srgb,
    var(--vscode-focusBorder) 30%,
    transparent
  );
  color: transparent;
}
```

---

## 📋 Color Usage Guide

### When to Use Each Color

| Purpose | Light Mode | Dark Mode | Variable |
|---------|------------|-----------|----------|
| Page background | 98% white | 8% grey | `--background` |
| Primary text | 12% grey | 95% grey | `--foreground` |
| Secondary text | 45% grey | 60% grey | `--muted-foreground` |
| Primary action | Blue (211°) | Lighter blue | `--primary` |
| Card surface | 100% white | 12% grey | `--card` |
| Borders | 90% grey | 20% grey | `--border` |
| Strong borders | 75% grey | 35% grey | `--border-strong` |
| Hover state | 94% grey | 20% grey | `--accent` |
| Success/Active | Green (142°) | Same green | `--status-active` |
| Destructive | Red (0°) | Lighter red | `--destructive` |
| Focus ring | Blue (211°) | Lighter blue | `--ring` |

---

## 🔧 Implementation Guide

### 1. Required Dependencies

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "@heroui/react": "^2.x",
    "@fontsource/azeret-mono": "^5.x",
    "@vscode/codicons": "^0.x"
  },
  "devDependencies": {
    "tailwindcss": "^4.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x"
  }
}
```

### 2. CSS Structure

```css
/* Import order matters! */

/* 1. External fonts and icons */
@import url("@vscode/codicons/dist/codicon.css");
@import url("@fontsource/azeret-mono/index.css");
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600");

/* 2. Tailwind layers */
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);

/* 3. Configuration */
@config "../tailwind.config.mjs";

/* 4. Custom styles */
/* Your custom CSS here */
```

### 3. Platform Detection

The design system automatically detects the platform:

```tsx
// Set platform attribute on root
<html data-platform="standalone"> // or omit for VSCode mode
```

### 4. Dark Mode Toggle

```tsx
// Add class to enable dark mode
<html data-platform="standalone" class="dark">
```

---

## 🎯 Best Practices

### ✅ Do's

- Use CSS variables from the design system
- Use spacing variables (`--spacing-*`)
- Use radius variables (`--radius-*`)
- Use semantic color names
- Use HSL format for colors (enables easy manipulation)
- Use transitions for smooth interactions
- Test in both light and dark modes
- Test in both VSCode and standalone modes

### ❌ Don'ts

- Don't hardcode pixel values
- Don't use hex/rgb colors directly
- Don't hardcode opacity values (use CSS variables)
- Don't create custom shadows (use `--shadow-*`)
- Don't skip focus states
- Don't forget hover/active states
- Don't use magic numbers

---

## 🚀 Quick Start

### Minimal Setup

1. **Install dependencies:**
```bash
npm install @heroui/react @fontsource/azeret-mono @vscode/codicons tailwindcss
```

2. **Copy configuration files:**
   - `tailwind.config.mjs`
   - `index.css`

3. **Import in your app:**
```tsx
import './index.css'
```

4. **Use the design tokens:**
```tsx
// Access via CSS variables
style={{ padding: 'var(--spacing-md)' }}

// Or via Tailwind
className="p-md rounded-md shadow-sm"
```

---

## 📊 File Structure

```
webview-ui/
├── src/
│   ├── index.css              # Main design system CSS
│   ├── components/
│   │   ├── chat/
│   │   │   └── colors.ts      # Timeline colors
│   │   └── common/
│   ├── utils/
│   │   └── vscStyles.ts       # VSCode variable helpers
│   └── assets/
├── tailwind.config.mjs        # Tailwind configuration
└── package.json
```

---

## 🎨 Color Constant Helpers

### colors.ts (Timeline Colors)

```typescript
export const COLOR_WHITE = "var(--color-timeline-white)"
export const COLOR_GRAY = "var(--color-timeline-gray)"
export const COLOR_DARK_GRAY = "var(--color-timeline-dark-gray)"
export const COLOR_BEIGE = "var(--color-timeline-beige)"
export const COLOR_BLUE = "var(--color-timeline-blue)"
export const COLOR_RED = "var(--color-timeline-red)"
export const COLOR_PURPLE = "var(--color-timeline-purple)"
export const COLOR_GREEN = "var(--color-timeline-green)"
```

### vscStyles.ts (VSCode Variables)

```typescript
export const VSC_INPUT_BACKGROUND = "--vscode-input-background"
export const VSC_FOREGROUND = "--vscode-foreground"
export const VSC_BUTTON_BACKGROUND = "--vscode-button-background"
// ...40+ more

// Helper functions
export function getAsVar(varName: string): string {
  return `var(${varName})`
}

export function hexToRGB(hexColor: string): { r: number; g: number; b: number } {
  // Converts hex to RGB object
}

export function colorToHex(colorVar: string): string {
  // Converts CSS variable to hex
}
```

---

## 💡 Advanced Usage

### Dynamic Theme Switching

```typescript
// Toggle dark mode
document.documentElement.classList.toggle('dark')

// Switch platform
document.documentElement.setAttribute('data-platform', 'standalone')
```

### Color Manipulation

```typescript
import { colorToHex, hexToRGB } from './utils/vscStyles'

// Get computed color value
const primaryColor = colorToHex('--primary')

// Convert to RGB for manipulation
const rgb = hexToRGB(primaryColor)
```

### Custom Shadows

```css
/* Combine existing shadows */
box-shadow: 
  var(--shadow-sm),
  0 0 0 3px hsl(var(--ring) / 0.1);
```

---

## 🔍 Troubleshooting

### Colors Not Updating

- Ensure `data-platform` attribute is set
- Check if dark mode class is applied correctly
- Verify CSS variable inheritance

### Fonts Not Loading

- Check Google Fonts import in index.css
- Ensure font-family is set correctly
- Verify local font installation for development

### Tailwind Not Working

- Ensure content paths in config are correct
- Check import order in index.css
- Verify @config directive is present

---

## 📚 References

### Essential Files

1. **src/index.css** - Complete design system implementation
2. **tailwind.config.mjs** - Tailwind customization
3. **src/components/chat/colors.ts** - Color constants
4. **src/utils/vscStyles.ts** - Helper utilities

### External Resources

- [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono)
- [VSCode Theme Color Reference](https://code.visualstudio.com/api/references/theme-color)
- [HeroUI Documentation](https://heroui.com)
- [Tailwind CSS v4](https://tailwindcss.com)

---

**Last Updated:** November 4, 2025  
**Version:** 1.0  
**License:** MIT
