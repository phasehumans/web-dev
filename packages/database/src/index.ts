import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './generated/client/index.js'

const connectionString = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL

if (!connectionString) {
    throw Error('Database URL is not set (neither DATABASE_URL nor TEST_DATABASE_URL)')
}

const adapter = new PrismaPg({
    connectionString,
})

export const prisma = new PrismaClient({
    adapter,
})

export * from './generated/client/index.js'
