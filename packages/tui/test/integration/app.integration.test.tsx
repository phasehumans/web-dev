import { describe, expect, it, mock } from 'bun:test'
import React from 'react'

import { ChatApp } from '../../src/app'
import { renderWithProviders } from '../test-providers'

describe('ChatApp TUI Integration', () => {
    it('renders top task HUD, header, message list, and input bar correctly', () => {
        const mockAgent = {
            abort: mock(),
            modelOptions: { model: 'test-model' },
        } as any

        const mockSession = {
            staticKey: 0,
            staticMessages: [{ id: 'header-1', role: 'header' }],
            activeMessages: [],
            isAuthenticated: true,
            currentEmail: 'user@example.com',
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

        const { lastFrame } = renderWithProviders(
            <ChatApp
                agent={mockAgent}
                isAuthenticated={true}
                cliVersion="0.2.20"
                userEmail="user@example.com"
                session={mockSession}
            />
        )

        const frame = lastFrame()
        expect(frame).toContain('December CLI')
        expect(frame).toContain('Ask December to build...')
    })
})
