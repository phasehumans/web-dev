import { describe, expect, it, mock } from 'bun:test'
import React from 'react'

import { ChatApp } from '../../src/app'
import { renderWithProviders } from '../test-providers'

describe('ChatApp TUI Integration', () => {
    it('renders header, message list, and input bar correctly', () => {
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
        expect(frame).toContain('? for shortcuts')
    })

    it('does not render model and shortcuts hint when menu (authUI) is active', () => {
        const mockAgent = {
            abort: mock(),
            modelOptions: { model: 'gemini-3.6-flash' },
        } as any

        const mockSession = {
            staticKey: 0,
            staticMessages: [{ id: 'header-1', role: 'header' }],
            activeMessages: [],
            isAuthenticated: true,
            currentEmail: 'user@example.com',
            authMode: 'settings_main',
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
        expect(frame).toContain('Settings')
        expect(frame).not.toContain('? for shortcuts')
        expect(frame).not.toContain('gemini-3.6-flash')
        expect(frame).not.toContain('Ask December to build...')
    })

    it('shows exit confirmation on first Ctrl+C and exits on second Ctrl+C', async () => {
        const mockAgent = {
            abort: mock(),
            modelOptions: { model: 'gemini-3.6-flash' },
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

        const originalExit = process.exit
        const mockExit = mock(() => {}) as any
        process.exit = mockExit

        try {
            const { stdin, lastFrame } = renderWithProviders(
                <ChatApp
                    agent={mockAgent}
                    isAuthenticated={true}
                    cliVersion="0.2.20"
                    userEmail="user@example.com"
                    session={mockSession}
                />
            )

            // First Ctrl+C
            stdin.write('\x03')
            await new Promise((r) => setTimeout(r, 50))
            expect(lastFrame()).toContain('Press Ctrl+C again to exit')
            expect(mockExit).not.toHaveBeenCalled()

            // Second Ctrl+C
            stdin.write('\x03')
            await new Promise((r) => setTimeout(r, 50))
            expect(mockExit).toHaveBeenCalledWith(0)
        } finally {
            process.exit = originalExit
        }
    })

    it('aborts streaming on first Ctrl+C and exits on second Ctrl+C', async () => {
        const mockAgent = {
            abort: mock(),
            modelOptions: { model: 'gemini-3.6-flash' },
        } as any

        const mockSession = {
            staticKey: 0,
            staticMessages: [{ id: 'header-1', role: 'header' }],
            activeMessages: [],
            isStreaming: true,
            handleAbort: mock(),
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

        const originalExit = process.exit
        const mockExit = mock(() => {}) as any
        process.exit = mockExit

        try {
            const { stdin, lastFrame } = renderWithProviders(
                <ChatApp
                    agent={mockAgent}
                    isAuthenticated={true}
                    cliVersion="0.2.20"
                    userEmail="user@example.com"
                    session={mockSession}
                />
            )

            // First Ctrl+C while streaming
            stdin.write('\x03')
            await new Promise((r) => setTimeout(r, 50))
            expect(mockSession.handleAbort).toHaveBeenCalled()
            expect(lastFrame()).toContain('Press Ctrl+C again to exit')
            expect(mockExit).not.toHaveBeenCalled()

            // Second Ctrl+C
            stdin.write('\x03')
            await new Promise((r) => setTimeout(r, 50))
            expect(mockExit).toHaveBeenCalledWith(0)
        } finally {
            process.exit = originalExit
        }
    })
})
