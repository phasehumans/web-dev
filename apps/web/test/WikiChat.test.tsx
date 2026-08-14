import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, afterEach } from 'bun:test'
import React from 'react'

import { WikiChat } from '../src/features/wiki/components/WikiChat'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, fireEvent, cleanup } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
})

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    })

describe('WikiChat Component', () => {
    test('renders welcome message and input field', () => {
        const queryClient = createTestQueryClient()

        render(
            <QueryClientProvider client={queryClient}>
                <WikiChat wikiId="wiki-123" repoFullName="testowner/testrepo" />
            </QueryClientProvider>
        )

        expect(screen.getByText('WikiChat Assistant')).toBeDefined()
        expect(screen.getByText(/Hello! I am your Repository AI Assistant/i)).toBeDefined()
        expect(screen.getByPlaceholderText('Ask a question about this repository...')).toBeDefined()
        expect(screen.getByRole('button', { name: /Send/i })).toBeDefined()
    })

    test('updates prompt input and sends message', () => {
        const queryClient = createTestQueryClient()

        render(
            <QueryClientProvider client={queryClient}>
                <WikiChat wikiId="wiki-123" repoFullName="testowner/testrepo" />
            </QueryClientProvider>
        )

        const input = screen.getByPlaceholderText('Ask a question about this repository...')
        fireEvent.change(input, { target: { value: 'How is authentication structured?' } })
        expect((input as HTMLInputElement).value).toBe('How is authentication structured?')

        const sendButton = screen.getByRole('button', { name: /Send/i })
        fireEvent.click(sendButton)

        // User message should appear in chat history
        expect(screen.getByText('How is authentication structured?')).toBeDefined()
    })
})
