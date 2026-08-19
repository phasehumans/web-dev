import { ChatApp } from '@december/tui'
import { describe, expect, it, mock } from 'bun:test'
import React from 'react'

import { renderWithProviders } from '../../packages/tui/test/test-providers'

describe('TUI Interactive Session Full E2E Tests', () => {
    it('mounts full ChatApp interactive session with header, past messages, and input bar', () => {
        const mockAgent = {
            abort: mock(),
            modelOptions: { model: 'claude-3-7-sonnet-latest' },
        } as any

        const mockSession = {
            staticKey: 0,
            staticMessages: [
                { id: 'hdr-1', role: 'header' },
                { id: 'usr-1', role: 'user', text: 'How do I optimize database queries?' },
                {
                    id: 'bot-1',
                    role: 'assistant',
                    blocks: [
                        {
                            type: 'text',
                            content: 'Use database indexing on frequently filtered columns.',
                        },
                    ],
                    usage: { promptTokens: 120, completionTokens: 35 },
                },
            ],
            activeMessages: [],
            isAuthenticated: true,
            currentEmail: 'lead-dev@phasehumans.com',
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

        const { lastFrame, unmount } = renderWithProviders(
            <ChatApp
                agent={mockAgent}
                isAuthenticated={true}
                cliVersion="0.3.9"
                userEmail="lead-dev@phasehumans.com"
                session={mockSession}
            />
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('December CLI')
        expect(frame).toContain('lead-dev@phasehumans.com')
        expect(frame).toContain('How do I optimize database queries?')
        expect(frame).toContain('Use database indexing on frequently filtered columns.')
        expect(frame).toContain('Ask December to build...')
        expect(frame).toContain('? for shortcuts')

        unmount()
    })

    it('renders streaming active turn with real-time thought block and tool execution outputs', () => {
        const mockAgent = {
            abort: mock(),
            modelOptions: { model: 'gemini-3.7-flash' },
        } as any

        const mockSession = {
            staticKey: 0,
            staticMessages: [],
            activeMessages: [
                {
                    id: 'streaming-bot',
                    role: 'assistant',
                    blocks: [
                        {
                            type: 'thinking',
                            content: 'Evaluating query plan with EXPLAIN ANALYZE...',
                            isStreaming: true,
                        },
                        {
                            type: 'command',
                            command: 'npm run test',
                            output: 'PASS test/unit/index.test.ts',
                            status: 'success',
                        },
                        { type: 'text', content: 'All unit tests passed successfully.' },
                    ],
                },
            ],
            isAuthenticated: true,
            currentEmail: 'engineer@phasehumans.com',
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
                userEmail="engineer@phasehumans.com"
                session={mockSession}
            />
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('Evaluating query plan with EXPLAIN ANALYZE')
        expect(frame).toContain('npm run test')
        expect(frame).toContain('All unit tests passed successfully.')

        unmount()
    })
})
