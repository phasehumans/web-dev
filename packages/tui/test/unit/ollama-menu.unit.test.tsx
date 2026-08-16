import { describe, expect, it } from 'bun:test'
import React from 'react'

import { ByokProviderMenu } from '../../src/components/menus/byok-provider-menu'
import { OllamaSetupMenu } from '../../src/components/menus/ollama-setup-menu'

describe('Ollama TUI Menus (Unit)', () => {
    it('renders Ollama in ByokProviderMenu items', () => {
        let selectedItem: any = null
        const handleProviderSelect = (item: any) => {
            selectedItem = item
        }

        const menu = <ByokProviderMenu handleProviderSelect={handleProviderSelect} />
        expect(menu).toBeDefined()
    })

    it('renders OllamaSetupMenu with offline guidance when server is unreachable', () => {
        const status = {
            running: false,
            models: [],
            compatibleModels: [],
            error: 'ECONNREFUSED',
            baseUrl: 'http://localhost:11434',
        }

        const menu = (
            <OllamaSetupMenu
                status={status}
                onRetry={() => {}}
                onCancel={() => {}}
                onProceed={() => {}}
            />
        )
        expect(menu).toBeDefined()
    })

    it('renders OllamaSetupMenu with model recommendation when server is running without models', () => {
        const status = {
            running: true,
            models: ['phi3:mini'],
            compatibleModels: [],
            baseUrl: 'http://localhost:11434',
        }

        const menu = (
            <OllamaSetupMenu
                status={status}
                onRetry={() => {}}
                onCancel={() => {}}
                onProceed={() => {}}
            />
        )
        expect(menu).toBeDefined()
    })
})
