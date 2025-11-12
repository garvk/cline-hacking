# Multiple Questions Feature

This document explains how to use the enhanced `ask_followup_question` tool that now supports multiple questions with different input types in a single turn.

## Overview

Cline can now ask multiple questions at once with different input types including:
- **MCQ (Multiple Choice Question)**: Select multiple answers
- **SCQ (Single Choice Question)**: Select one answer
- **Text**: Short text input
- **Textarea**: Long text input
- **Number**: Numeric input
- **Boolean**: Yes/No question

## Usage

### Single Question (Legacy Format - Still Supported)

```xml
<ask_followup_question>
<question>What is your preferred programming language?</question>
<options>["JavaScript", "Python", "Go", "Rust"]</options>
</ask_followup_question>
```

### Multiple Questions (New Format)

```xml
<ask_followup_question>
<questions>
[
  {
    "id": "language",
    "type": "scq",
    "question": "What programming language would you like to use?",
    "options": ["JavaScript", "Python", "Go", "Rust"],
    "required": true
  },
  {
    "id": "framework",
    "type": "mcq",
    "question": "Which frameworks are you familiar with? (Select all that apply)",
    "options": ["React", "Vue", "Angular", "Svelte"],
    "required": false
  },
  {
    "id": "project_name",
    "type": "text",
    "question": "What would you like to name your project?",
    "placeholder": "my-awesome-project",
    "required": true,
    "minLength": 3,
    "maxLength": 50
  },
  {
    "id": "description",
    "type": "textarea",
    "question": "Please provide a detailed description of your project",
    "placeholder": "Enter description here...",
    "required": false,
    "maxLength": 500
  },
  {
    "id": "port",
    "type": "number",
    "question": "What port should the development server run on?",
    "defaultValue": "3000",
    "min": 1000,
    "max": 65535,
    "required": true
  },
  {
    "id": "use_typescript",
    "type": "boolean",
    "question": "Would you like to use TypeScript?",
    "required": true
  }
]
</questions>
</ask_followup_question>
```

## Question Types

### SCQ (Single Choice Question)
- User can select exactly one option
- Renders as clickable buttons
- Selected option gets a checkmark

```json
{
  "id": "theme",
  "type": "scq",
  "question": "Select a theme",
  "options": ["Light", "Dark", "Auto"],
  "required": true
}
```

### MCQ (Multiple Choice Question)
- User can select multiple options
- Renders as checkbox-style buttons
- Multiple selections allowed

```json
{
  "id": "features",
  "type": "mcq",
  "question": "Select features to enable",
  "options": ["Authentication", "Database", "API", "Testing"],
  "required": false
}
```

### Text Input
- Short single-line text input
- Supports placeholder, min/max length validation

```json
{
  "id": "username",
  "type": "text",
  "question": "Enter your username",
  "placeholder": "john_doe",
  "minLength": 3,
  "maxLength": 20,
  "required": true
}
```

### Textarea
- Multi-line text input
- Good for longer responses
- Supports placeholder and length validation

```json
{
  "id": "notes",
  "type": "textarea",
  "question": "Additional notes",
  "placeholder": "Enter any additional information...",
  "maxLength": 1000,
  "required": false
}
```

### Number Input
- Numeric input only
- Supports min/max validation

```json
{
  "id": "timeout",
  "type": "number",
  "question": "Timeout in seconds",
  "min": 1,
  "max": 300,
  "defaultValue": "30",
  "required": true
}
```

### Boolean
- Yes/No question
- Renders as two buttons

```json
{
  "id": "confirm",
  "type": "boolean",
  "question": "Are you sure you want to proceed?",
  "required": true
}
```

## Response Format

When the user submits their answers, Cline receives a JSON object with all responses:

```json
{
  "responses": {
    "language": "JavaScript",
    "framework": ["React", "Vue"],
    "project_name": "my-awesome-app",
    "description": "This is a web application for...",
    "port": "3000",
    "use_typescript": "true"
  }
}
```

## Field Properties

### Common Properties (All Types)
- `id` (required): Unique identifier for the question
- `type` (required): One of: "mcq", "scq", "text", "textarea", "number", "boolean"
- `question` (required): The question text
- `required` (optional): Whether the question must be answered (default: true)

### Type-Specific Properties

**SCQ & MCQ:**
- `options` (required): Array of string options

**Text & Textarea:**
- `placeholder` (optional): Placeholder text
- `minLength` (optional): Minimum length validation
- `maxLength` (optional): Maximum length validation
- `defaultValue` (optional): Default value

**Number:**
- `min` (optional): Minimum value
- `max` (optional): Maximum value
- `defaultValue` (optional): Default value
- `placeholder` (optional): Placeholder text

## UI Features

- **Visual Styling**: Each question type has appropriate visual styling
- **Required Field Indicator**: Required questions show an asterisk (*)
- **Validation**: All inputs are validated before submission
- **Submit Button**: Disabled until all required fields are filled
- **Responsive Design**: Works well on different screen sizes
- **State Management**: Answers are preserved if user navigates away and returns

## Best Practices

1. **Use appropriate types**: Choose the input type that best matches what you're asking
2. **Group related questions**: Ask related questions together in one turn
3. **Clear question text**: Be specific and clear in your questions
4. **Reasonable defaults**: Provide sensible default values when applicable
5. **Don't overload**: While you can ask many questions, don't overwhelm the user
6. **Mark optional fields**: Make it clear which questions are optional

## Example Use Cases

### Project Setup
Ask about language, framework, project name, and configuration in one turn.

### Configuration Wizard
Gather all configuration settings at once instead of one-by-one.

### Feature Selection
Let users select multiple features they want enabled.

### Form-like Inputs
When you need structured data, use multiple questions instead of asking for free-form text.
