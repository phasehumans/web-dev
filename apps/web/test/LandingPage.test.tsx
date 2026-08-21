import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { describe, it, expect, mock, afterEach } from 'bun:test'
import React from 'react'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, fireEvent, cleanup } = await import('@testing-library/react')

import { BentoGridSection } from '../src/features/landing/components/BentoGridSection'
import { CliDeepDiveSection } from '../src/features/landing/components/CliDeepDiveSection'
import { FaqSection } from '../src/features/landing/components/FaqSection'
import { LandingPage } from '../src/features/landing/LandingPage'

afterEach(() => {
    cleanup()
})

describe('LandingPage Component Suite', () => {
    it('renders landing page hero and branding correctly', () => {
        const onLaunchApp = mock(() => {})
        const onSignIn = mock(() => {})

        render(<LandingPage onLaunchApp={onLaunchApp} onSignIn={onSignIn} />)

        // Headline check
        expect(screen.getByText(/The autonomous AI coding agent for/i)).toBeDefined()
        expect(screen.getByText(/npm i -g @trydecember\/cli/i)).toBeDefined()
        expect(screen.getByText(/Start on Cloud/i)).toBeDefined()
    })

    it('handles interactive terminal simulator command switching in CLI section', () => {
        render(<CliDeepDiveSection />)

        expect(
            screen.getByText(/December CLI: Lightning fast, local TUI, full autonomy/i)
        ).toBeDefined()

        // Click /handoff command button
        const handoffBtn = screen.getByText(/\$ \/handoff/i)
        fireEvent.click(handoffBtn)
        expect(screen.getByText(/DECEMBER CLOUD MIGRATION/i)).toBeDefined()

        // Click --help command button
        const helpBtn = screen.getByText(/\$ december --help/i)
        fireEvent.click(helpBtn)
        expect(screen.getByText(/Autonomous AI Coding Agent/i)).toBeDefined()
    })

    it('handles MCP tool explorer switching in Bento section', () => {
        render(<BentoGridSection />)

        expect(screen.getByText(/Native dynamic tools via Model Context Protocol/i)).toBeDefined()

        // Switch to github server tab
        const githubTab = screen.getByRole('button', { name: 'github' })
        fireEvent.click(githubTab)
        expect(screen.getByText(/github_create_pull_request/i)).toBeDefined()

        // Switch to search server tab
        const searchTab = screen.getByRole('button', { name: 'search' })
        fireEvent.click(searchTab)
        expect(screen.getByText(/brave_web_search/i)).toBeDefined()
    })

    it('handles FAQ item toggling', () => {
        render(<FaqSection />)

        expect(screen.getByText(/Everything you need to know/i)).toBeDefined()
        const faqQuestion = screen.getByText(/Can I bring my own API keys \(BYOK\)\?/i)
        fireEvent.click(faqQuestion)
        expect(screen.getByText(/You can provide your own API keys for Anthropic/i)).toBeDefined()
    })
})
