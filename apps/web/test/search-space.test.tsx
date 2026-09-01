import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, afterEach, beforeEach, mock } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { ChatPromptInput } from '../src/features/chat/components/ChatPromptInput'
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

        expect(getByText('Thoughts')).not.toBeNull()
        // Content hidden initially
        expect(queryByText(thoughtText)).toBeNull()

        // Toggle open
        const accordionBtn = getByText('Thoughts')
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
        const { getByText, getAllByText } = render(<SearchMarkdown content={fullMarkdown} />)

        // Thought block
        expect(getByText('Thoughts')).not.toBeNull()

        // Heading
        expect(getByText('Search Overview')).not.toBeNull()

        // Bold & Inline Code
        expect(getByText('React Hooks')).not.toBeNull()
        expect(getAllByText('useState').length).toBeGreaterThan(0)

        // Code block
        expect(getByText('typescript')).not.toBeNull()
    })

    test('SearchMarkdown supports mermaid diagram rendering', () => {
        const mermaidMarkdown = `
\`\`\`mermaid
graph TD
    A[Client] --> B[Server]
\`\`\`
`
        const { getByTitle, container } = render(<SearchMarkdown content={mermaidMarkdown} />)
        expect(getByTitle('Copy diagram code')).not.toBeNull()
        expect(container.querySelector('.bg-\\[\\#18181A\\]')).not.toBeNull()
    })

    test('SearchMarkdown renders sequenceDiagram cleanly without duplicate code block', () => {
        const sequenceMarkdown = `
\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Traffic as User Traffic
    participant CloudWatch as Monitoring System
    participant Scaler as AutoScaler
    participant Fleet as Application Servers

    Traffic->>Fleet: Sudden Spike in Traffic
    CloudWatch->>CloudWatch: Detects CPU usage > 80%
    CloudWatch->>Scaler: Trigger Alert: High Load
    Scaler->>Fleet: Spin up 2 new instances (Scale Out)
    Fleet-->>Traffic: Handles high load smoothly
\`\`\`
`
        const { getByTitle, container } = render(<SearchMarkdown content={sequenceMarkdown} />)
        expect(getByTitle('Copy diagram code')).not.toBeNull()
        expect(
            container.querySelector('svg') || container.querySelector('.bg-\\[\\#18181A\\]')
        ).not.toBeNull()
    })

    test('SearchMarkdown filters out horizontal divider lines like --- and displays thinking state', () => {
        const markdownWithDivider = `
# Title

---

This is clean content without divider lines.

---
`
        const { getByText, queryByText } = render(<SearchMarkdown content={markdownWithDivider} />)

        expect(getByText('Title')).not.toBeNull()
        expect(getByText('This is clean content without divider lines.')).not.toBeNull()
        expect(queryByText('---')).toBeNull()

        // Test thinking indicator when streaming without content
        const { getByText: getThinkingText } = render(
            <SearchMarkdown content="" isStreaming={true} />
        )
        expect(getThinkingText('Thinking...')).not.toBeNull()
    })

    test('SearchMarkdown supports markdown tables with alignment, empty lines and math arrows', () => {
        const tableMarkdown = `
### HTTP vs WebSockets

| Feature | HTTP | WebSockets |

| :--- | :--- | :--- |

| Communication | One-way (Client Request $\\rightarrow$ Server Response) | Two-way (Client $\\leftrightarrow$ Server) |

| Connection | Opens and closes per request | Stays open constantly |

| Overhead | High (HTTP headers sent every time) | Low (headers only sent during handshake) |

| Best For | Fetching pages, REST APIs, CRUD ops | Live chats, multiplayer games, financial feeds |
`
        const { getByText } = render(<SearchMarkdown content={tableMarkdown} />)

        expect(getByText('HTTP vs WebSockets')).not.toBeNull()
        expect(getByText('Feature')).not.toBeNull()
        expect(getByText('HTTP')).not.toBeNull()
        expect(getByText('WebSockets')).not.toBeNull()
        expect(getByText('Communication')).not.toBeNull()
        expect(getByText('One-way (Client Request → Server Response)')).not.toBeNull()
        expect(getByText('Two-way (Client ↔ Server)')).not.toBeNull()
        expect(getByText('Stays open constantly')).not.toBeNull()
        expect(getByText('Live chats, multiplayer games, financial feeds')).not.toBeNull()
    })

    test('SearchSpaceScreen renders header with clean minimal controls inside 3 dots dropdown', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        })

        const { queryByTitle, getByTitle, getByPlaceholderText, getByText } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/search']}>
                    <SearchSpaceScreen initialPrompt="What is December?" />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Input prompt placeholder
        expect(getByPlaceholderText('Ask anything...')).not.toBeNull()

        // Header options: Settings and standalone Flag removed, 3 dots kept
        expect(queryByTitle('Settings')).toBeNull()

        const moreBtn = getByTitle('More options')
        expect(moreBtn).not.toBeNull()

        // Clicking 3 dots opens dropdown: Share, Archive, Delete
        fireEvent.click(moreBtn)
        expect(getByText('Share')).not.toBeNull()
        expect(getByText('Archive')).not.toBeNull()
        expect(getByText('Delete')).not.toBeNull()
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

    test('SearchMarkdown renders thoughts prop in accordion and content in normal chat markdown', async () => {
        const thoughts = 'Let me look up the details about React 19'
        const content = 'React 19 introduces Actions and Server Components by default.'

        const { getByText, queryByText } = render(
            <SearchMarkdown thoughts={thoughts} content={content} />
        )

        // Normal content is visible directly in chat
        expect(getByText(content)).not.toBeNull()

        // Thoughts accordion button is visible
        expect(getByText('Thoughts')).not.toBeNull()

        // Thoughts content is hidden until expanded
        expect(queryByText(thoughts)).toBeNull()

        // Expand thoughts
        const btn = getByText('Thoughts')
        await act(async () => {
            fireEvent.click(btn)
        })

        expect(getByText(thoughts)).not.toBeNull()
    })

    test('ChatPromptInput in search mode hides attach repo icon and triggers onUpload on plus button click when authenticated', async () => {
        let uploadCalled = false
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        })

        const { getByText, queryByText, container } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <ChatPromptInput
                        value=""
                        onChange={() => {}}
                        onSubmit={() => {}}
                        mode="search"
                        isAuthenticated={true}
                        onUpload={() => {
                            uploadCalled = true
                        }}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Tooltip says Upload attachment instead of Attach or mention
        expect(getByText('Upload attachment')).not.toBeNull()
        expect(queryByText('Attach or mention')).toBeNull()

        // Attach repo button is not rendered
        expect(queryByText('Attach repo')).toBeNull()

        // Find the plus button
        const plusButton = container.querySelector('button')
        expect(plusButton).not.toBeNull()

        await act(async () => {
            fireEvent.click(plusButton!)
        })

        // Dropdown menu items are not shown in search mode
        expect(queryByText('Repositories')).toBeNull()
        expect(queryByText('Sessions')).toBeNull()
        expect(uploadCalled).toBe(true)
    })

    test('ChatPromptInput in search mode when unauthenticated triggers onOpenAuth and does not trigger onUpload on plus button click', async () => {
        let uploadCalled = false
        let authCalled = false
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        })

        const { container } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <ChatPromptInput
                        value=""
                        onChange={() => {}}
                        onSubmit={() => {}}
                        mode="search"
                        isAuthenticated={false}
                        onOpenAuth={() => {
                            authCalled = true
                        }}
                        onUpload={() => {
                            uploadCalled = true
                        }}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        const plusButton = container.querySelector('button')
        expect(plusButton).not.toBeNull()

        await act(async () => {
            fireEvent.click(plusButton!)
        })

        expect(authCalled).toBe(true)
        expect(uploadCalled).toBe(false)
    })

    test('ChatPromptInput in search mode renders Thinking mode toggle button (default off) and toggles state', async () => {
        let thinkingEnabled = false
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        })

        const { getByText } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <ChatPromptInput
                        value=""
                        onChange={() => {}}
                        onSubmit={() => {}}
                        mode="search"
                        isThinkingMode={thinkingEnabled}
                        onToggleThinking={(enabled: boolean) => {
                            thinkingEnabled = enabled
                        }}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Thinking button is rendered
        const thinkingBtn = getByText('Thinking')
        expect(thinkingBtn).not.toBeNull()

        // Tooltip says Thinking mode: Off by default
        expect(getByText('Thinking mode: Off')).not.toBeNull()

        // Click Thinking button to toggle on
        await act(async () => {
            fireEvent.click(thinkingBtn)
        })

        expect(thinkingEnabled).toBe(true)
    })

    test('ChatPromptInput autofocuses textarea and refocuses after generation finishes', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        })

        const { getByPlaceholderText, rerender } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <ChatPromptInput
                        value=""
                        onChange={() => {}}
                        onSubmit={() => {}}
                        mode="search"
                        placeholder="Ask anything..."
                        isGenerating={true}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        const textarea = getByPlaceholderText('Ask anything...') as HTMLTextAreaElement
        expect(textarea).not.toBeNull()

        // When generation finishes (isGenerating -> false), textarea refocuses
        await act(async () => {
            rerender(
                <QueryClientProvider client={queryClient}>
                    <MemoryRouter>
                        <ChatPromptInput
                            value=""
                            onChange={() => {}}
                            onSubmit={() => {}}
                            mode="search"
                            placeholder="Ask anything..."
                            isGenerating={false}
                        />
                    </MemoryRouter>
                </QueryClientProvider>
            )
            await new Promise((r) => setTimeout(r, 100))
        })

        expect(document.activeElement).toBe(textarea)
    })

    test('SearchSpaceScreen renders assistant errors as clean red text without cards or borders', () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        })

        const mockDetail = {
            project: { id: 'session-err-1', title: 'Error Session', type: 'SEARCH' },
            session: { id: 'session-err-1', title: 'Error Session', type: 'SEARCH' },
            chatMessages: [
                { id: 'm1', role: 'USER', content: 'Trigger error test' },
                {
                    id: 'm2',
                    role: 'ASSISTANT',
                    content: 'Connection timed out',
                    error: 'Connection timed out',
                },
            ],
            versions: [],
            selectedVersionId: null,
        }

        const { getByText, container } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/search?sessionId=session-err-1']}>
                    <SearchSpaceScreen />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Error is displayed directly in red text, not in a bordered card
        const errorElement = container.querySelector('.text-red-400')
        expect(container.querySelector('.bg-red-950\\/30')).toBeNull()
        expect(container.querySelector('.border-red-800\\/40')).toBeNull()
    })
})
