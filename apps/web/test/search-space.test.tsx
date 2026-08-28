import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, afterEach, beforeEach, mock } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import {
    SearchMarkdown,
    SearchCodeBlock,
    SearchThoughtsAccordion,
} from '../src/features/search/components/SearchMarkdown'
import { SearchSpaceScreen } from '../src/features/search/components/SearchSpaceScreen'
import { sessionAPI } from '../src/features/sessions/api/session'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, cleanup, fireEvent, act } = await import('@testing-library/react')

describe('Search Space & Markdown Features (#453, #454, #455, #456, #457)', () => {
    let mockWriteText: any

    beforeEach(() => {
        mockWriteText = mock(() => Promise.resolve())
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: mockWriteText,
            },
            writable: true,
            configurable: true,
        })
    })

    afterEach(() => {
        cleanup()
    })

    test('SearchCodeBlock renders language badge and triggers copy on click', async () => {
        const testCode = 'const greeting = "Hello December";\nconsole.log(greeting);'
        const { getByText } = render(<SearchCodeBlock language="typescript" code={testCode} />)

        expect(getByText('typescript')).not.toBeNull()
        expect(getByText('Copy')).not.toBeNull()
        expect(getByText((content) => content.includes('Hello December'))).not.toBeNull()

        const copyButton = getByText('Copy')
        await act(async () => {
            fireEvent.click(copyButton)
        })

        expect(mockWriteText).toHaveBeenCalledWith(testCode)
        expect(getByText('Copied!')).not.toBeNull()
    })

    test('SearchThoughtsAccordion renders thoughts and toggles expanded state', async () => {
        const thoughtText = 'First analyze user query and find dependencies in package.json.'
        const { getByText, queryByText } = render(<SearchThoughtsAccordion content={thoughtText} />)

        expect(getByText('Thoughts & Reasoning')).not.toBeNull()
        expect(getByText('9 words')).not.toBeNull()
        // Content hidden initially
        expect(queryByText(thoughtText)).toBeNull()

        // Toggle open
        const accordionBtn = getByText('Thoughts & Reasoning')
        await act(async () => {
            fireEvent.click(accordionBtn)
        })

        expect(getByText(thoughtText)).not.toBeNull()
    })

    test('SearchMarkdown parses inline thoughts, markdown typography and code blocks', () => {
        const fullMarkdown = `
<thought>Planning how to structure React component</thought>
# Search Overview

Here is an explanation of **React Hooks** with an *emphasis* on \`useEffect\`.

- First hook is \`useState\`
- Second hook is \`useEffect\`

\`\`\`typescript
export function useCounter() {
    const [count, setCount] = useState(0);
    return count;
}
\`\`\`
`
        const { getByText } = render(<SearchMarkdown content={fullMarkdown} />)

        // Thought block
        expect(getByText('Thoughts & Reasoning')).not.toBeNull()

        // Heading
        expect(getByText('Search Overview')).not.toBeNull()

        // Bold & Inline Code
        expect(getByText('React Hooks')).not.toBeNull()
        expect(getByText('useState')).not.toBeNull()

        // Code block
        expect(getByText('typescript')).not.toBeNull()
    })

    test('SearchSpaceScreen renders header, search conversation and feedback buttons', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        })

        const { getByText, getByTitle, getByPlaceholderText } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/search']}>
                    <SearchSpaceScreen initialPrompt="What is December?" />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Input prompt placeholder
        expect(getByPlaceholderText('Ask December...')).not.toBeNull()

        // Header options
        expect(getByTitle('Settings')).not.toBeNull()
        expect(getByTitle('Flag')).not.toBeNull()
        expect(getByTitle('More options')).not.toBeNull()
    })

    test('SearchSpaceScreen loads and renders multi-turn conversation messages', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        })

        const mockDetail = {
            project: { id: 'session-multi-1', title: 'React Hooks Query', type: 'SEARCH' },
            session: { id: 'session-multi-1', title: 'React Hooks Query', type: 'SEARCH' },
            chatMessages: [
                { id: 'm1', role: 'USER', content: 'What is useEffect?' },
                {
                    id: 'm2',
                    role: 'ASSISTANT',
                    content: 'useEffect handles side effects in React.',
                },
                { id: 'm3', role: 'USER', content: 'How to clean it up?' },
                {
                    id: 'm4',
                    role: 'ASSISTANT',
                    content: 'Return a cleanup function from the callback.',
                },
            ],
            versions: [],
            selectedVersionId: null,
            activeVersion: null,
            generatedFiles: {},
            canvasState: {} as any,
        }

        const originalGetSessionDetail = sessionAPI.getSessionDetail
        sessionAPI.getSessionDetail = mock(() => Promise.resolve(mockDetail as any))

        try {
            const { getByText, findByText } = render(
                <QueryClientProvider client={queryClient}>
                    <MemoryRouter initialEntries={['/search?session=session-multi-1']}>
                        <SearchSpaceScreen />
                    </MemoryRouter>
                </QueryClientProvider>
            )

            expect(await findByText('What is useEffect?')).not.toBeNull()
            expect(await findByText('useEffect handles side effects in React.')).not.toBeNull()
            expect(await findByText('How to clean it up?')).not.toBeNull()
            expect(await findByText('Return a cleanup function from the callback.')).not.toBeNull()
        } finally {
            sessionAPI.getSessionDetail = originalGetSessionDetail
        }
    })
})
