import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, mock, afterEach } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { WikiView } from '../src/features/wiki/components/WikiView'

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

describe('WikiView Component', () => {
    test('renders centered CTA card with Connect GitHub button when user is not connected', () => {
        const queryClient = createTestQueryClient()
        const onConnectMock = mock()

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <WikiView
                        initialData={{
                            githubConnected: false,
                            repos: [],
                        }}
                        onConnectGitHub={onConnectMock}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        expect(screen.getByText(/Connect GitHub to view all repositories/i)).toBeDefined()
        const button = screen.getByRole('button', { name: /Connect GitHub/i })
        expect(button).toBeDefined()

        fireEvent.click(button)
        expect(onConnectMock).toHaveBeenCalledTimes(1)
    })

    test('renders grid of GitHub repositories with search filter input when user is connected', () => {
        const queryClient = createTestQueryClient()
        const mockRepos = [
            {
                id: 'repo-1',
                name: 'december-core',
                fullName: 'user/december-core',
                owner: 'user',
                isPrivate: false,
                description: 'Core engine platform',
                status: 'IDLE' as const,
            },
            {
                id: 'repo-2',
                name: 'docs-site',
                fullName: 'user/docs-site',
                owner: 'user',
                isPrivate: true,
                description: 'Documentation site',
                status: 'COMPLETED' as const,
                wikiId: 'wiki-123',
            },
        ]

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <WikiView
                        initialData={{
                            githubConnected: true,
                            repos: mockRepos,
                        }}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        expect(screen.getByText('Repositories')).toBeDefined()
        const searchInput = screen.getByPlaceholderText('Search repositories...')
        expect(searchInput).toBeDefined()

        expect(screen.getByText('december-core')).toBeDefined()
        expect(screen.getByText('docs-site')).toBeDefined()

        // Filter search input
        fireEvent.change(searchInput, { target: { value: 'docs' } })

        expect(screen.queryByText('december-core')).toBeNull()
        expect(screen.getByText('docs-site')).toBeDefined()
    })

    test('renders status badge and calls onOpenWiki when View Wiki button is clicked', () => {
        const queryClient = createTestQueryClient()
        const onOpenWikiMock = mock()
        const mockRepos = [
            {
                id: 'repo-2',
                name: 'docs-site',
                fullName: 'user/docs-site',
                owner: 'user',
                isPrivate: true,
                description: 'Documentation site',
                status: 'COMPLETED' as const,
                wikiId: 'wiki-123',
            },
        ]

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <WikiView
                        initialData={{
                            githubConnected: true,
                            repos: mockRepos,
                        }}
                        onOpenWiki={onOpenWikiMock}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        const repoTitle = screen.getByText('docs-site')
        expect(repoTitle).toBeDefined()
        fireEvent.click(repoTitle)
        expect(onOpenWikiMock).toHaveBeenCalledWith('wiki-123')
    })

    test('renders spinner badge when status is GENERATING', () => {
        const queryClient = createTestQueryClient()
        const mockRepos = [
            {
                id: 'repo-3',
                name: 'generating-repo',
                fullName: 'user/generating-repo',
                owner: 'user',
                isPrivate: false,
                description: 'Generating repo',
                status: 'GENERATING' as const,
            },
        ]

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <WikiView
                        initialData={{
                            githubConnected: true,
                            repos: mockRepos,
                        }}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        expect(screen.getByText('Generating...')).toBeDefined()
    })
})
