import { describe, expect, it } from 'bun:test'
import React from 'react'

import { ByokProviderMenu } from '../../src/components/menus/byok-provider-menu'
import { LocalSetupMenu, OllamaSetupMenu } from '../../src/components/menus/ollama-setup-menu'
import { renderWithProviders } from '../test-providers'

describe('Local Provider Setup Menus (Unit)', () => {
    it('renders Ollama, LM Studio, and llama.cpp in ByokProviderMenu items', () => {
        let selectedItem: any = null
        const handleProviderSelect = (item: any) => {
            selectedItem = item
        }

        const { lastFrame } = renderWithProviders(
            <ByokProviderMenu handleProviderSelect={handleProviderSelect} />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('Select API Provider (BYOK):')
    })

    it('renders OllamaSetupMenu with offline guidance when server is unreachable', () => {
        const status = {
            running: false,
            models: [],
            compatibleModels: [],
            error: 'ECONNREFUSED',
            baseUrl: 'http://localhost:11434',
        }

        const { lastFrame } = renderWithProviders(
            <OllamaSetupMenu
                provider="ollama"
                status={status}
                onRetry={() => {}}
                onCancel={() => {}}
                onProceed={() => {}}
            />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('Ollama Local Provider Diagnostics & Setup')
        expect(frame).toContain('Not detected at http://localhost:11434')
        expect(frame).toContain('ollama serve')
        expect(frame).toContain('ollama pull qwen2.5-coder:7b')
    })

    it('renders LM Studio setup guidance when server is unreachable', () => {
        const status = {
            running: false,
            models: [],
            compatibleModels: [],
            error: 'ECONNREFUSED',
            baseUrl: 'http://localhost:1234',
        }

        const { lastFrame } = renderWithProviders(
            <LocalSetupMenu
                provider="lmstudio"
                status={status}
                onRetry={() => {}}
                onCancel={() => {}}
                onProceed={() => {}}
            />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('LM Studio Local Provider Diagnostics & Setup')
        expect(frame).toContain('Not detected at http://localhost:1234')
        expect(frame).toContain('Developer / Local Server tab')
        expect(frame).toContain('qwen2.5-coder-7b-instruct')
    })

    it('renders llama.cpp setup guidance when server is unreachable', () => {
        const status = {
            running: false,
            models: [],
            compatibleModels: [],
            error: 'ECONNREFUSED',
            baseUrl: 'http://localhost:8080',
        }

        const { lastFrame } = renderWithProviders(
            <LocalSetupMenu
                provider="llamacpp"
                status={status}
                onRetry={() => {}}
                onCancel={() => {}}
                onProceed={() => {}}
            />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('llama.cpp Local Provider Diagnostics & Setup')
        expect(frame).toContain('Not detected at http://localhost:8080')
        expect(frame).toContain('llama-server')
        expect(frame).toContain('qwen2.5-coder-7b-instruct.gguf')
    })

    it('renders OllamaSetupMenu with model recommendation when server is running without models', () => {
        const status = {
            running: true,
            models: ['phi3:mini'],
            compatibleModels: [],
            baseUrl: 'http://localhost:11434',
        }

        const { lastFrame } = renderWithProviders(
            <OllamaSetupMenu
                status={status}
                onRetry={() => {}}
                onCancel={() => {}}
                onProceed={() => {}}
            />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('Running (http://localhost:11434)')
        expect(frame).toContain('None found')
    })
})
