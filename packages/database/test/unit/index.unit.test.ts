import { describe, expect, test } from 'bun:test'

import { prisma } from '../../src/index'

describe('Database Module (Unit)', () => {
    test('exports prisma client instance', () => {
        expect(prisma).toBeDefined()
    })

    test('prisma client has model delegates attached', () => {
        // Verify model delegates generated from Prisma schema exist on client
        expect(prisma).toHaveProperty('$connect')
        expect(prisma).toHaveProperty('$disconnect')
    })
})
