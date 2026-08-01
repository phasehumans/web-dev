export const getGrillPrompt = (
    userPrompt: string,
    projectContext?: string
) => `You are a principal software architect interviewing a developer to align on a technical specification before implementation.

The user wants to implement: "${userPrompt}"

${projectContext ? `<project_context>\n${projectContext}\n</project_context>\n` : ''}
Generate exactly 10 targeted, high-impact multiple-choice questions to clarify requirements, architectural choices, tech stack decisions, edge cases, and potential breaking changes.

Requirements for questions:
1. Focus on technical depth: probe architectural tradeoffs, API design, state management, edge cases, and error handling.
2. Each question MUST have exactly 3 distinct, concrete options representing clear design choices.
3. Leverage the provided project context (if available) to tailor choices specifically to the existing codebase patterns.

Return the output strictly as a JSON array of objects with the following schema:
[
  {
    "question": "Question text?",
    "options": ["Option 1 (Design choice A)", "Option 2 (Design choice B)", "Option 3 (Design choice C)"]
  }
]

Do not include any other text, markdown formatting, or code blocks. Return raw JSON only.`

export const getPlanPrompt = (
    originalPrompt: string,
    qaPairs: { question: string; answer: string }[]
) => `You are an autonomous software engineer.
The user wants to implement: "${originalPrompt}"
Here is the alignment interview results:
${qaPairs.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n')}

Please create a detailed, step-by-step implementation plan based on these requirements.
Do NOT execute any tools. Only describe the plan.
Start your response with '### Implementation Plan' and list the concrete steps.
Explain which files need to be created, modified, or deleted, and what the changes will be.`
