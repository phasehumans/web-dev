import { describe, expect, it, mock } from 'bun:test'
import React from 'react'

import { ChatApp } from '../../src/app'
import { renderWithProviders } from '../test-providers'

describe('TUI Subsystem Smoke Tests', () => {
    it('mounts ChatApp, renders header and input bar, and unmounts cleanly without errors', () => {
        const mockAgent = {
            abort: mock(),
            modelOptions: { model: 'default' },
        } as any

        const mockSession = {
            staticKey: 0,
            staticMessages: [{ id: 'header-smoke', role: 'header' }],
            activeMessages: [],
            isAuthenticated: true,
            currentEmail: 'smoke@december.dev',
            authMode: 'none',
            grillMode: false,
            setStaticMessages: mock(),
            setStaticKey: mock(),
            setActiveMessages: mock(),
            setAuthMode: mock(),
            handleSubmit: mock(),
            authMethod: 'API Key',
            hasBothAuth: false,
            getProviderModels: mock(async () => []),
        }

        const { lastFrame, unmount } = renderWithProviders(
            <ChatApp
                agent={mockAgent}
                isAuthenticated={true}
                cliVersion="0.3.9"
                userEmail="smoke@december.dev"
                session={mockSession}
            />
        )

        expect(lastFrame()).toContain('December CLI')
        expect(lastFrame()).toContain('smoke@december.dev')
        unmount()
    })
})
