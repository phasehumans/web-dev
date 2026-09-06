import { describe, expect, it } from 'bun:test'

import {
    formatProviderName,
    PROVIDER_KEY_URLS,
    PROVIDER_NAMES,
} from '../../src/components/menus/byok-key-menu'
import { PROVIDER_MENU_ITEMS } from '../../src/components/menus/byok-provider-menu'

describe('BYOK Provider URLs & Names Audit (Unit)', () => {
    it('ensures all 27 BYOK providers have corresponding key URLs starting with https://', () => {
        expect(PROVIDER_MENU_ITEMS.length).toBe(27)

        for (const item of PROVIDER_MENU_ITEMS) {
            const url = PROVIDER_KEY_URLS[item.value]
            expect(url).toBeDefined()
            expect(typeof url).toBe('string')
            expect(url.startsWith('https://')).toBe(true)
        }
    })

    it('ensures all 27 BYOK providers have a display name defined in PROVIDER_NAMES', () => {
        for (const item of PROVIDER_MENU_ITEMS) {
            const name = PROVIDER_NAMES[item.value]
            expect(name).toBeDefined()
            expect(typeof name).toBe('string')
            expect(name.length).toBeGreaterThan(0)
            expect(formatProviderName(item.value)).toBe(name)
        }
    })

    it('validates specific exact destination URLs for major providers', () => {
        expect(PROVIDER_KEY_URLS['anthropic']).toBe('https://console.anthropic.com/settings/keys')
        expect(PROVIDER_KEY_URLS['arcee']).toBe('https://platform.arcee.ai/api/api-keys')
        expect(PROVIDER_KEY_URLS['openai']).toBe('https://platform.openai.com/api-keys')
        expect(PROVIDER_KEY_URLS['google']).toBe('https://aistudio.google.com/app/apikey')
        expect(PROVIDER_KEY_URLS['openrouter']).toBe('https://openrouter.ai/settings/keys')
        expect(PROVIDER_KEY_URLS['deepseek']).toBe('https://platform.deepseek.com/api_keys')
        expect(PROVIDER_KEY_URLS['groq']).toBe('https://console.groq.com/keys')
        expect(PROVIDER_KEY_URLS['dashscope']).toBe('https://dashscope.console.aliyun.com/apiKey')
        expect(PROVIDER_KEY_URLS['minimax']).toBe(
            'https://platform.minimaxi.com/user-center/basic-information/interface-key'
        )
        expect(PROVIDER_KEY_URLS['lmstudio']).toBe('https://lmstudio.ai/')
        expect(PROVIDER_KEY_URLS['llamacpp']).toBe('https://github.com/ggerganov/llama.cpp')
        expect(PROVIDER_KEY_URLS['ollama']).toBe('https://ollama.com/download')
    })
})
