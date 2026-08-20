import { describe, expect, it, mock } from 'bun:test'
import React from 'react'

import { ChatApp } from '../../src/app'
import { renderWithProviders } from '../test-providers'

describe('TUI State Flow & Menu Transitions (Integration)', () => {
    it('switches between normal prompt view and interactive settings menu', () => {
        const mockAgent = {
            abort: mock(),
            modelOptions: { model: 'claude-3-7-sonnet-latest' },
        } as any

        const baseSession = {
            staticKey: 0,
            staticMessages: [{ id: 'header-1', role: 'header' }],
            activeMessages: [],
            isAuthenticated: true,
            currentEmail: 'engineer@phasehumans.com',
            authMode: 'none',
            grillMode: false,
            setStaticMessages: mock(),
            setStaticKey: mock(),
            setActiveMessages: mock(),
            setAuthMode: mock(),
            handleSubmit: mock(),
            authMethod: 'December Cloud',
            hasBothAuth: true,
            getProviderModels: mock(async () => []),
        }

        const appNormal = renderWithProviders(
            <ChatApp
                agent={mockAgent}
                isAuthenticated={true}
                cliVersion="0.3.9"
                userEmail="engineer@phasehumans.com"
                session={baseSession}
            />
        )

        expect(appNormal.lastFrame()).toContain('December CLI')
        expect(appNormal.lastFrame()).toContain('Ask December to build...')
        appNormal.unmount()

        // Render in settings mode
        const settingsSession = {
            ...baseSession,
            authMode: 'settings_main',
        }

        const appSettings = renderWithProviders(
            <ChatApp
                agent={mockAgent}
                isAuthenticated={true}
                cliVersion="0.3.9"
                userEmail="engineer@phasehumans.com"
                session={settingsSession}
            />
        )

        expect(appSettings.lastFrame()).toContain('Settings')
        expect(appSettings.lastFrame()).not.toContain('Ask December to build...')
        appSettings.unmount()
    })
})
