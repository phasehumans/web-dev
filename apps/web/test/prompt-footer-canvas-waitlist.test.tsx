import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, spyOn, afterEach, beforeEach, mock } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { canvasAPI } from '../src/features/canvas/api'
import { WorkspaceHeader } from '../src/features/preview/components/WorkspaceHeader'
import { profileAPI } from '../src/features/profile/api/profile'
import { sessionAPI } from '../src/features/sessions/api/session'
import { PromptFooter } from '../src/shared/components/ui/PromptFooter'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, fireEvent, cleanup, waitFor } = await import('@testing-library/react')

describe('PromptFooter & WorkspaceScreen: Canvas Card, Waitlist, Plus Menu & Back Navigation', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        })
    })

    afterEach(() => {
        cleanup()
    })

    test('Canvas button toggles preview card on click without opening a new tab', async () => {
        const mockOpen = spyOn(window, 'open').mockImplementation(() => null as any)

        spyOn(profileAPI, 'getProfile').mockImplementation(async () => ({
            id: 'test-user',
            name: 'Test',
            username: 'test',
            email: 'test@example.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            emailVerified: true,
            receiveNotification: true,
            googleId: null,
            githubConnected: false,
            canvasWaitlist: false,
        }))

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <PromptFooter
                        onUpload={() => {}}
                        onSubmit={() => {}}
                        hasInput={false}
                        isLoading={false}
                        isAuthenticated={true}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        const canvasButton = screen.getByRole('button', { name: 'Canvas' })
        expect(canvasButton).not.toBeNull()

        // Card should initially be closed
        expect(screen.queryByText('Introducing Context Canvas')).toBeNull()

        // Click canvas button to toggle card open
        fireEvent.click(canvasButton)
        expect(screen.getByText('Introducing Context Canvas')).not.toBeNull()
        expect(mockOpen).not.toHaveBeenCalled()

        // Click canvas button again to toggle card closed
        fireEvent.click(canvasButton)
        expect(screen.queryByText('Introducing Context Canvas')).toBeNull()
    })

    test('Join waitlist button calls onOpenAuth when user is unauthenticated', async () => {
        let authOpened = false
        const onOpenAuth = () => {
            authOpened = true
        }

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <PromptFooter
                        onUpload={() => {}}
                        onSubmit={() => {}}
                        hasInput={false}
                        isLoading={false}
                        isAuthenticated={false}
                        onOpenAuth={onOpenAuth}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        const canvasButton = screen.getByRole('button', { name: 'Canvas' })
        fireEvent.click(canvasButton)

        const joinWaitlistBtn = screen.getByRole('button', { name: 'Join waitlist' })
        fireEvent.click(joinWaitlistBtn)

        expect(authOpened).toBe(true)
    })

    test('Join waitlist button calls canvasAPI.joinWaitlist and updates to Joined waitlist', async () => {
        spyOn(profileAPI, 'getProfile').mockImplementation(async () => ({
            id: 'test-user',
            name: 'Test',
            username: 'test',
            email: 'test@example.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            emailVerified: true,
            receiveNotification: true,
            googleId: null,
            githubConnected: false,
            canvasWaitlist: false,
        }))

        let waitlistJoined = false
        spyOn(canvasAPI, 'joinWaitlist').mockImplementation(async () => {
            waitlistJoined = true
            return { canvasWaitlist: true }
        })

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <PromptFooter
                        onUpload={() => {}}
                        onSubmit={() => {}}
                        hasInput={false}
                        isLoading={false}
                        isAuthenticated={true}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        const canvasButton = screen.getByRole('button', { name: 'Canvas' })
        fireEvent.click(canvasButton)

        const joinWaitlistBtn = screen.getByRole('button', { name: 'Join waitlist' })
        expect(joinWaitlistBtn).not.toBeNull()

        fireEvent.click(joinWaitlistBtn)

        await waitFor(() => {
            expect(waitlistJoined).toBe(true)
        })
    })

    test('Join waitlist button renders disabled as "Joined waitlist" if user already joined', async () => {
        spyOn(profileAPI, 'getProfile').mockImplementation(async () => ({
            id: 'test-user',
            name: 'Test',
            username: 'test',
            email: 'test@example.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            emailVerified: true,
            receiveNotification: true,
            googleId: null,
            githubConnected: false,
            canvasWaitlist: true,
        }))

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <PromptFooter
                        onUpload={() => {}}
                        onSubmit={() => {}}
                        hasInput={false}
                        isLoading={false}
                        isAuthenticated={true}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        const canvasButton = screen.getByRole('button', { name: 'Canvas' })
        fireEvent.click(canvasButton)

        await waitFor(() => {
            const joinedBtn = screen.getByRole('button', { name: 'Joined waitlist' })
            expect(joinedBtn).not.toBeNull()
            expect(joinedBtn.hasAttribute('disabled')).toBe(true)
        })
    })

    test('+ icon dropdown has Secrets, no Send secrets, and no Codebase files', async () => {
        let selectedOption = ''
        const onOptionSelect = (trigger: string) => {
            selectedOption = trigger
        }

        const { container } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <PromptFooter
                        onUpload={() => {}}
                        onSubmit={() => {}}
                        hasInput={false}
                        isLoading={false}
                        isAuthenticated={true}
                        onOptionSelect={onOptionSelect}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Find the plus button (first button in container)
        const plusButton = container.querySelector('button')
        expect(plusButton).not.toBeNull()
        fireEvent.click(plusButton!)

        // Check menu items
        expect(screen.getByText('Secrets')).not.toBeNull()
        expect(screen.queryByText('Send secrets')).toBeNull()
        expect(screen.queryByText('Codebase files')).toBeNull()

        // Click Secrets
        const secretsOption = screen.getByText('Secrets')
        fireEvent.click(secretsOption)
        expect(selectedOption).toBe('secrets:')
    })

    test('Workspace header back button calls onBack directly without exit confirmation modal', async () => {
        let backClicked = false
        const onBack = () => {
            backClicked = true
        }

        sessionAPI.getSession = mock(async () => ({
            id: 'session-123',
            title: 'Test Session',
            type: 'WEB' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectId: null,
            projectName: null,
            lastMessage: 'hello',
            prNumber: null,
            prState: null,
        }))

        const { container } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <WorkspaceHeader
                        projectId="session-123"
                        projectName="Test Session"
                        onBack={onBack}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        const backBtn = container.querySelector('header button')
        expect(backBtn).not.toBeNull()
        fireEvent.click(backBtn!)

        expect(backClicked).toBe(true)
        expect(screen.queryByText('Are you sure you want to exit the current project?')).toBeNull()
    })
})
