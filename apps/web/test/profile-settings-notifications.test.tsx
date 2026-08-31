import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, describe, afterEach, beforeEach, mock, spyOn } from 'bun:test'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { profileAPI } from '../src/features/profile/api/profile'
import { ProfileGeneralSettings } from '../src/features/profile/components/ProfileGeneralSettings'
import { ProfileSettingsContent } from '../src/features/profile/components/ProfileSettingsContent'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, cleanup, fireEvent } = await import('@testing-library/react')

describe('Profile Settings Notifications Tab Placement', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        })
        spyOn(profileAPI, 'getRules').mockImplementation(async () => ({ rules: '' }))
    })

    afterEach(() => {
        mock.restore()
        cleanup()
    })

    test('ProfileGeneralSettings (Preferences tab) renders Notifications section with toggles', () => {
        const handleNotificationToggle = mock(() => {})
        const handleChatSuggestionsToggle = mock(() => {})
        const handleGenerationSoundChange = mock(() => {})

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <ProfileGeneralSettings
                        chatSuggestions={true}
                        generationSound="FIRST_GENERATION"
                        emailNotifications={true}
                        productUpdates={false}
                        securityAlerts={true}
                        onChatSuggestionsToggle={handleChatSuggestionsToggle}
                        onGenerationSoundChange={handleGenerationSoundChange}
                        onNotificationToggle={handleNotificationToggle}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Headings
        expect(screen.getByRole('heading', { name: 'Preferences' })).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Notifications' })).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Custom Rules' })).toBeDefined()

        // Notification options
        expect(screen.getByText('Project activity')).toBeDefined()
        expect(
            screen.getByText('Get notification updates when someone interacts with your projects')
        ).toBeDefined()
        expect(screen.getByText('Product updates')).toBeDefined()
        expect(
            screen.getByText('Get notification updates about new features and improvements')
        ).toBeDefined()
        expect(screen.getByText('Security alerts')).toBeDefined()
        expect(
            screen.getByText('Get notification updates for important security notices')
        ).toBeDefined()

        // Toggle switches
        const switches = screen.getAllByRole('switch')
        // 1 for chatSuggestions + 3 for notifications = 4 switches
        expect(switches.length).toBe(4)

        // Click Project activity switch (second switch)
        fireEvent.click(switches[1])
        expect(handleNotificationToggle).toHaveBeenCalledWith('notifyProjectActivity', false)

        // Click Product updates switch (third switch)
        fireEvent.click(switches[2])
        expect(handleNotificationToggle).toHaveBeenCalledWith('notifyProductUpdates', true)
    })

    test('ProfileSettingsContent (Account tab) does NOT render Notifications section', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <ProfileSettingsContent
                        profile={{
                            id: 'test-user',
                            name: 'Test User',
                            email: 'test@example.com',
                            username: 'testuser',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            emailVerified: true,
                            receiveNotification: true,
                            googleId: null,
                            githubConnected: false,
                            hasPassword: true,
                        }}
                        resolvedName="Test User"
                        hasProfile={true}
                        isGithubConnected={false}
                        onOpenNameModal={() => {}}
                        onOpenUsernameModal={() => {}}
                        onOpenPasswordModal={() => {}}
                        onConnectGithub={() => {}}
                        onSignOut={() => {}}
                        onOpenSignOutAllSessionsModal={() => {}}
                        onOpenDeleteAccountModal={() => {}}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        )

        // Account and System sections should exist
        expect(screen.getByRole('heading', { name: 'Account' })).toBeDefined()
        expect(screen.getByRole('heading', { name: 'System' })).toBeDefined()

        // Notifications section should NOT exist in Account tab
        expect(screen.queryByRole('heading', { name: 'Notifications' })).toBeNull()
        expect(screen.queryByText('Project activity')).toBeNull()
        expect(screen.queryByText('Product updates')).toBeNull()
        expect(screen.queryByText('Security alerts')).toBeNull()
    })
})
