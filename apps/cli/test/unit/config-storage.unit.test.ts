import { describe, expect, it } from 'bun:test'

import { loadConfig, getAuthStatus } from '../../src/config'

describe('CLI Config Storage & Auth Status (Unit)', () => {
    it('returns valid config object structure from loadConfig', async () => {
        const config = await loadConfig()
        expect(config).toBeDefined()
        expect(typeof config).toBe('object')
        expect(config.providers).toBeDefined()
    })

    it('returns auth status object', async () => {
        const status = await getAuthStatus()
        expect(status).toBeDefined()
        expect(typeof status.hasByok).toBe('boolean')
        expect(typeof status.hasDecember).toBe('boolean')
        expect(['byok', 'december']).toContain(status.authPriority)
    })
})
