import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, afterEach } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { useAppStore } from '../src/app/store'
import { HomeHero } from '../src/features/home/components/HomeHero'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, cleanup, fireEvent } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
    useAppStore.setState({
        isAuthenticated: false,
    })
})

describe('HomeHero Get Started Section', () => {
    test('renders Get Started section when user is not authenticated', () => {
        useAppStore.setState({ isAuthenticated: false })

        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        })

        const { getByText, queryByText, getAllByText } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <HomeHero onPromptSubmit={() => {}} onOpenAuth={() => {}} />
                </MemoryRouter>
            </QueryClientProvider>
        )

        expect(getByText('Get Started')).not.toBeNull()
        expect(getByText('Connect GitHub')).not.toBeNull()
        expect(getAllByText('Star on GitHub').length).toBeGreaterThan(0)
        expect(getByText('Give feedback')).not.toBeNull()
        expect(queryByText('Recent Sessions')).toBeNull()
    })

    test('renders Get Started section and does not render Recent Sessions when authenticated and sessions exist', () => {
        useAppStore.setState({ isAuthenticated: true })

        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        })

        const { getByText, queryByText, getAllByText } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <HomeHero onPromptSubmit={() => {}} onOpenAuth={() => {}} />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Verify Get Started section is rendered and Recent Sessions is never displayed
        expect(getByText('Get Started')).not.toBeNull()
        expect(getByText('Connect GitHub')).not.toBeNull()
        expect(getAllByText('Star on GitHub').length).toBeGreaterThan(0)
        expect(getByText('Give feedback')).not.toBeNull()
        expect(queryByText('Recent Sessions')).toBeNull()
    })
})
