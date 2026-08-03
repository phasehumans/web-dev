import { describe, test, expect } from 'bun:test'

import { isNewerVersion, CHECK_TTL_MS } from '../src/utils/version-check'

describe('Version Check Utility (Unit)', () => {
    test('isNewerVersion compares semver versions correctly', () => {
        expect(isNewerVersion('0.2.25', '0.2.26')).toBe(true)
        expect(isNewerVersion('0.2.25', '0.3.0')).toBe(true)
        expect(isNewerVersion('0.2.25', '1.0.0')).toBe(true)
        expect(isNewerVersion('v0.2.25', 'v0.2.26')).toBe(true)

        expect(isNewerVersion('0.2.25', '0.2.25')).toBe(false)
        expect(isNewerVersion('0.2.26', '0.2.25')).toBe(false)
        expect(isNewerVersion('1.0.0', '0.9.9')).toBe(false)
    })

    test('CHECK_TTL_MS is configured to 24 hours', () => {
        expect(CHECK_TTL_MS).toBe(24 * 60 * 60 * 1000)
    })
})
