# Design System Reference Guide

This document contains all the technical CSS styles, themes, and fonts used in this webapp. Use this as a complete reference to replicate the same design system in another project.

---

## 🎨 Design Philosophy

**Minimalist Monochrome Design with Monospace Typography**

- Pure greyscale palette with no colors (except one status color)
- Monospace fonts throughout for a technical, editorial feel
- Grid-based layout aligned to character width
- Thin, precise borders (1-2px)
- Zero border radius (sharp corners everywhere)

---

## 📝 Core Fonts

### Primary Font Stack

```css
font-family: 'IBM Plex Mono', 'Courier New', monospace;
```

**IBM Plex Mono** is the primary font used throughout the entire application.

### Import Method

The font is imported via Tailwind configuration and applied globally. You'll need to ensure IBM Plex Mono is available (either via Google Fonts CDN or local installation).

### Typography Settings

```css
--font-size: 1rem;
--line-height: 1.5;
font-weight: 400; /* Regular weight for body */
font-weight: 600; /* Semi-bold for headings */
letter-spacing: 0; /* No additional letter spacing */
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### Heading Configuration

```css
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  letter-spacing: 0;
  line-height: calc(var(--line-height) * 2); /* Double line-height for headings */
}
```

---

## 🎨 Color System (HSL Format)

### Light Mode Colors

```css
:root {
  /* Backgrounds & Surfaces */
  --background: 0 0% 100%;        /* Pure white */
  --foreground: 0 0% 5%;          /* Near black */
  --card: 0 0% 100%;              /* White */
  --card-foreground: 0 0% 5%;     /* Near black */
  --popover: 0 0% 100%;           /* White */
  --popover-foreground: 0 0% 5%;  /* Near black */
  
  /* Primary Actions */
  --primary: 0 0% 5%;             /* Near black */
  --primary-foreground: 0 0% 98%; /* Off-white */
  
  /* Secondary Elements */
  --secondary: 0 0% 97%;          /* Very light grey */
  --secondary-foreground: 0 0% 5%; /* Near black */
  
  /* Muted/Subtle */
  --muted: 0 0% 97%;              /* Very light grey */
  --muted-foreground: 0 0% 50%;   /* Mid grey */
  
  /* Accent/Hover States */
  --accent: 0 0% 95%;             /* Light grey */
  --accent-foreground: 0 0% 5%;   /* Near black */
  
  /* Status Colors */
  --status-active: 142 76% 45%;   /* Vibrant green for active projects */
  
  /* Destructive Actions */
  --destructive: 0 0% 15%;        /* Dark grey */
  --destructive-foreground: 0 0% 98%; /* Off-white */
  
  /* Borders & Inputs */
  --border: 0 0% 88%;             /* Light grey border */
  --border-strong: 0 0% 15%;      /* Strong black border */
  --input: 0 0% 88%;              /* Light grey */
  --ring: 0 0% 15%;               /* Focus ring color */
}
```

### Dark Mode Colors

```css
.dark {
  /* Backgrounds & Surfaces */
  --background: 0 0% 5%;          /* Near black */
  --foreground: 0 0% 98%;         /* Off-white */
  --card: 0 0% 8%;                /* Dark grey */
  --card-foreground: 0 0% 98%;    /* Off-white */
  --popover: 0 0% 8%;             /* Dark grey */
  --popover-foreground: 0 0% 98%; /* Off-white */
  
  /* Primary Actions */
  --primary: 0 0% 98%;            /* Off-white */
  --primary-foreground: 0 0% 5%;  /* Near black */
  
  /* Secondary Elements */
  --secondary: 0 0% 12%;          /* Dark grey */
  --secondary-foreground: 0 0% 98%; /* Off-white */
  
  /* Muted/Subtle */
  --muted: 0 0% 12%;              /* Dark grey */
  --muted-foreground: 0 0% 60%;   /* Light grey */
  
  /* Accent/Hover States */
  --accent: 0 0% 15%;             /* Dark grey */
  --accent-foreground: 0 0% 98%;  /* Off-white */
  
  /* Status Colors */
  --status-active: 142 76% 45%;   /* Same vibrant green */
  
  /* Destructive Actions */
  --destructive: 0 0% 85%;        /* Light grey */
  --destructive-foreground: 0 0% 5%; /* Near black */
  
  /* Borders & Inputs */
  --border: 0 0% 20%;             /* Medium grey */
  --border-strong: 0 0% 85%;      /* Light grey (inverted) */
  --input: 0 0% 20%;              /* Medium grey */
  --ring: 0 0% 85%;               /* Light grey focus ring */
}
```

---

## 📐 Custom Design Tokens

```css
/* Border widths */
--line-thin: 1px;
--line-medium: 2px;

/* Layout spacing */
--spacing-grid: 8px;

/* Transitions */
--transition-smooth: all 0.15s ease;

/* Border radius (none!) */
--radius: 0rem;
```

---

## 🛠️ Tailwind Configuration

### Complete tailwind.config.ts

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
        sans: ['IBM Plex Mono', 'Courier New', 'monospace'],
        serif: ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "border-strong": "hsl(var(--border-strong))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## 🎯 Custom Utility Classes

### Line Frames

```css
.line-frame {
  border: var(--line-thin) solid hsl(var(--border));
}

.line-frame-strong {
  border: var(--line-medium) solid hsl(var(--border-strong));
}
```

### Line Decoration

```css
.line-decoration {
  position: relative;
  padding-left: 3rem;
}

.line-decoration::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.5em;
  width: 2rem;
  height: var(--line-thin);
  background: hsl(var(--border-strong));
}
```

### Grid Layout

```css
.grid-base {
  display: grid;
  gap: calc(var(--spacing-grid) * 2);
}
```

### Monospace Grid Background (Debug Mode)

```css
.monospace-grid-bg {
  position: relative;
  min-height: calc(100vh - 200px);
}

.monospace-grid-bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  background-image:
    repeating-linear-gradient(
      0deg,
      hsl(var(--border)) 0 1px,
      transparent 1px 100%
    ),
    repeating-linear-gradient(
      90deg,
      hsl(var(--border)) 0 1px,
      transparent 1px 100%
    );
  background-size: 1ch calc(var(--font-size) * var(--line-height));
  pointer-events: none;
  opacity: 0.5;
}
```

---

## 📦 Required Dependencies

### Core Dependencies

```json
{
  "dependencies": {
    "@owickstrom/the-monospace-web": "^0.1.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    
    "next-themes": "^0.3.0",
    "lucide-react": "^0.462.0"
  },
  "devDependencies": {
    "@tailwindcss/typography": "^0.5.16",
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react-swc": "^3.11.0",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.3",
    "vite": "^5.4.19"
  }
}
```

### shadcn/ui Component Library

This project uses shadcn/ui components. All components are in `src/components/ui/` and are built on top of Radix UI primitives.

**Key Radix UI dependencies:**
- @radix-ui/react-accordion
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-popover
- @radix-ui/react-separator
- @radix-ui/react-tabs
- @radix-ui/react-toast
- And many more (see package.json)

---

## 🎨 Special Design Feature: The Monospace Web

This project integrates **@owickstrom/the-monospace-web** library which provides:

- Character-aligned grid system
- Editorial typography
- Precise monospace alignment

**Import in CSS:**
```css
@import '@owickstrom/the-monospace-web/src/index.css';
```

This must be imported **before** Tailwind directives.

---

## 📋 Common Styling Patterns

### Navigation Links

```tsx
<Link
  to={path}
  className="font-mono text-sm transition-opacity opacity-60 hover:opacity-100"
>
  {text}
</Link>
```

### Active Navigation State

```tsx
className={`font-mono text-sm transition-opacity ${
  isActive ? "opacity-100 underline" : "opacity-60 hover:opacity-100"
}`}
```

### Borders

```tsx
className="border-b border-border"  // Thin border
className="border border-border-strong"  // Strong border
```

### Layout Container

```tsx
<div className="max-w-4xl mx-auto px-6 py-12">
  {/* content */}
</div>
```

### Responsive Spacing

```tsx
className="flex flex-col md:flex-row gap-4"
className="flex flex-wrap gap-x-6 gap-y-3"
```

---

## 📁 Essential Files to Reference

### 1. **src/index.css**
- Complete CSS variables definition
- Custom utility classes
- Base styles
- Monospace web overrides

### 2. **tailwind.config.ts**
- Extended theme configuration
- Font definitions
- Color system
- Animations

### 3. **components.json**
- shadcn/ui configuration
- Component aliases
- Path configuration

### 4. **src/components/Layout.tsx**
- Main layout structure
- Navigation patterns
- Header/Footer styling
- Responsive design patterns

### 5. **package.json**
- All dependencies
- Build scripts
- Version requirements

### 6. **postcss.config.js** & **vite.config.ts**
- Build tool configuration

---

## 🚀 Quick Start Setup

To replicate this design system in a new project:

1. **Install dependencies:**
```bash
npm install @owickstrom/the-monospace-web tailwindcss postcss autoprefixer
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
npm install next-themes lucide-react
```

2. **Copy configuration files:**
   - `tailwind.config.ts`
   - `postcss.config.js`
   - `components.json`

3. **Copy CSS:**
   - `src/index.css` (complete file)

4. **Import IBM Plex Mono font:**
   Add to your HTML head or use Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
```

5. **Use dark mode provider:**
```tsx
import { ThemeProvider } from "next-themes"

<ThemeProvider attribute="class" defaultTheme="light">
  {/* your app */}
</ThemeProvider>
```

---

## 💡 Design Principles

1. **Monospace Everything**: All fonts are monospace (IBM Plex Mono)
2. **Pure Greyscale**: Only black, white, and greys (except status green)
3. **No Border Radius**: Everything has sharp corners (0rem)
4. **Thin Borders**: 1px for subtle, 2px for emphasis
5. **Grid-Based**: Everything aligns to character grid
6. **Minimal Opacity Changes**: Hover states use opacity transitions
7. **HSL Color Format**: All colors in HSL for easy manipulation

---

## 📊 Component Library Structure

All UI components follow shadcn/ui patterns and are located in:
- `src/components/ui/` - Reusable UI components
- `src/components/` - Page-specific components
- `src/lib/utils.ts` - Utility functions (includes `cn()` for class merging)

---

## 🎯 Key Color Usage

| Purpose | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Page background | 100% white | 5% grey (near black) |
| Primary text | 5% grey (near black) | 98% grey (off-white) |
| Secondary text | 50% grey | 60% grey |
| Borders | 88% grey | 20% grey |
| Hover backgrounds | 95% grey | 15% grey |
| Active status | Green (142 76% 45%) | Same green |

---

## 📝 Notes

- All colors **must** be in HSL format
- Border radius is always `0rem` (no rounded corners)
- Font weight: 400 (regular) or 600 (semi-bold) only
- Line height: 1.5 for body, 3.0 for headings
- Transitions: 0.15s ease for smooth interactions
- Max content width: 1400px (2xl container)
- Standard padding: px-6 (24px horizontal)

---

This design system creates a **minimalist, technical, editorial aesthetic** perfect for portfolios, documentation sites, and developer-focused web applications.
