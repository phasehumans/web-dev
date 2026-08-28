import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, spyOn, afterEach, beforeEach, mock } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { canvasAPI } from '../src/features/canvas/api'
import { PromptInput } from '../src/features/home/components/PromptInput'
import { MENTION_PROVIDERS } from '../src/features/home/hooks/usePromptInputController'
import { WorkspaceHeader } from '../src/features/preview/components/WorkspaceHeader'
import { profileAPI } from '../src/features/profile/api/profile'
import { secretsAPI } from '../src/features/profile/api/secrets'
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

    test('@ mention in PromptInput matches + icon dropdown options (Repositories, Sessions, Skills, Secrets)', async () => {
        let promptValue = '@'
        const setPromptValue = (val: string) => {
            promptValue = val
        }

        // Verify MENTION_PROVIDERS list directly
        const providerTitles = MENTION_PROVIDERS.map((p) => p.title)
        expect(providerTitles).toEqual(['Repositories', 'Sessions', 'Skills', 'Secrets'])
        expect(providerTitles).not.toContain('Codebase files')
        expect(providerTitles).not.toContain('Send secrets')

        const { rerender } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <PromptInput
                        onSubmit={() => {}}
                        isLoading={false}
                        isAuthenticated={true}
                        value={promptValue}
                        onChange={setPromptValue}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Dropdown menu should show Repositories, Sessions, Skills, Secrets
        expect(screen.getByText('Repositories')).not.toBeNull()
        expect(screen.getByText('Sessions')).not.toBeNull()
        expect(screen.getByText('Skills')).not.toBeNull()
        expect(screen.getByText('Secrets')).not.toBeNull()

        // Should NOT show Codebase files or Send secrets
        expect(screen.queryByText('Codebase files')).toBeNull()
        expect(screen.queryByText('Send secrets')).toBeNull()

        // Clicking Secrets replaces @ with @secrets:
        const secretsBtn = screen.getByText('Secrets')
        fireEvent.click(secretsBtn)
        expect(promptValue).toBe('@secrets:')
    })

    test('@ mention in PromptInput filters by search mode', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <PromptInput
                        onSubmit={() => {}}
                        isLoading={false}
                        isAuthenticated={true}
                        value="@"
                        onChange={() => {}}
                        mode="search"
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        expect(screen.getByText('Repositories')).not.toBeNull()
        expect(screen.queryByText('Sessions')).toBeNull()
        expect(screen.queryByText('Skills')).toBeNull()
        expect(screen.queryByText('Secrets')).toBeNull()
        expect(screen.queryByText('Codebase files')).toBeNull()
        expect(screen.queryByText('Send secrets')).toBeNull()
    })

    test('@repos: in PromptInput renders Connect GitHub as a hyperlink when GitHub is not connected', async () => {
        spyOn(profileAPI, 'getProfile').mockImplementation(async () => ({
            id: 'user-456',
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
                    <PromptInput
                        onSubmit={() => {}}
                        isLoading={false}
                        isAuthenticated={true}
                        value="@repos:"
                        onChange={() => {}}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // "Repositories" header is shown
        expect(screen.getByText('Repositories')).not.toBeNull()

        // "Connect GitHub" should be rendered as a link with href
        const connectLink = screen.getByRole('link', { name: /Connect GitHub/i })
        expect(connectLink).not.toBeNull()
        expect(connectLink.getAttribute('href')).toContain('github.com/apps')
        expect(connectLink.getAttribute('href')).toContain('installations/new')

        // Suffix text should be visible
        expect(screen.getByText(/to see repos\./i)).not.toBeNull()
    })

    test('@sessions: in PromptInput searches and selects sessions', async () => {
        let promptValue = '@sessions:'
        const setPromptValue = (val: string) => {
            promptValue = val
        }

        spyOn(sessionAPI, 'getSessions').mockImplementation(async () => ({
            sessions: [
                {
                    id: 'session-101',
                    title: 'Dashboard Redesign',
                    type: 'WEB' as const,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastMessage: 'Build dashboard widgets',
                },
                {
                    id: 'session-102',
                    title: 'Authentication Flow',
                    type: 'WEB' as const,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastMessage: 'Add OAuth flow',
                },
            ],
        }))

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <PromptInput
                        onSubmit={() => {}}
                        isLoading={false}
                        isAuthenticated={true}
                        value={promptValue}
                        onChange={setPromptValue}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Dropdown shows Sessions header and loaded session titles
        expect(screen.getByText('Sessions')).not.toBeNull()
        expect(await screen.findByText('Dashboard Redesign')).not.toBeNull()
        expect(await screen.findByText('Authentication Flow')).not.toBeNull()

        // Clicking a session replaces @sessions: with @session:Title
        const sessionItem = screen.getByText('Dashboard Redesign')
        fireEvent.click(sessionItem)
        expect(promptValue).toBe('@session:Dashboard Redesign ')
    })

    test('@skills: in PromptInput searches and selects skills', async () => {
        let promptValue = '@skills:'
        const setPromptValue = (val: string) => {
            promptValue = val
        }

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <PromptInput
                        onSubmit={() => {}}
                        isLoading={false}
                        isAuthenticated={true}
                        value={promptValue}
                        onChange={setPromptValue}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Dropdown shows Skills header and default skills
        expect(screen.getByText('Skills')).not.toBeNull()
        expect(screen.getByText('frontend-design')).not.toBeNull()
        expect(screen.getByText('tdd')).not.toBeNull()

        // Clicking a skill replaces @skills: with @skill:name
        const skillItem = screen.getByText('frontend-design')
        fireEvent.click(skillItem)
        expect(promptValue).toBe('@skill:frontend-design ')
    })

    test('@secrets: in PromptInput searches and selects secrets', async () => {
        let promptValue = '@secrets:'
        const setPromptValue = (val: string) => {
            promptValue = val
        }

        spyOn(secretsAPI, 'getSecrets').mockImplementation(async () => ({
            secrets: [
                {
                    id: 'sec-1',
                    name: 'OPENAI_API_KEY',
                    note: 'Production OpenAI key',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'sec-2',
                    name: 'DATABASE_URL',
                    note: 'Postgres DB string',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ],
        }))

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <PromptInput
                        onSubmit={() => {}}
                        isLoading={false}
                        isAuthenticated={true}
                        value={promptValue}
                        onChange={setPromptValue}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Dropdown shows Secrets header and secrets list
        expect(screen.getByText('Secrets')).not.toBeNull()
        expect(await screen.findByText('OPENAI_API_KEY')).not.toBeNull()
        expect(await screen.findByText('DATABASE_URL')).not.toBeNull()

        // Clicking a secret replaces @secrets: with @secret:name
        const secretItem = screen.getByText('OPENAI_API_KEY')
        fireEvent.click(secretItem)
        expect(promptValue).toBe('@secret:OPENAI_API_KEY ')
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
