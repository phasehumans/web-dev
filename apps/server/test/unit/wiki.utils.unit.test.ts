import { describe, it, expect } from 'bun:test'

import { slugify } from '../../src/modules/wiki/wiki.utils'

describe('Wiki Utils - Unit Tests', () => {
    describe('slugify', () => {
        it('should lowercase and replace spaces/underscores with hyphens', () => {
            expect(slugify('Hello World')).toBe('hello-world')
            expect(slugify('Getting_Started_Guide')).toBe('getting-started-guide')
            expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces')
        })

        it('should strip special characters and clean leading/trailing hyphens', () => {
            expect(slugify('What is React #1?!')).toBe('what-is-react-1')
            expect(slugify('--Leading and Trailing--')).toBe('leading-and-trailing')
            expect(slugify('API & Security (v2.0)')).toBe('api-security-v20')
        })
    })
})
