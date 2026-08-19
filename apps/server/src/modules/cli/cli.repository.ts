import { prisma } from '@december/database'

import { reconcileCliMessages } from './cli.utils'

import type { CreateCliSession } from './cli.types'

const createSession = async (data: CreateCliSession) => {
    const { userId, title, messages, minioPrefix } = data
    const reconciledMessages = reconcileCliMessages(messages)

    return prisma.session.create({
        data: {
            userId,
            title,
            type: 'CLI',
            minioPrefix,
            messages: {
                create: reconciledMessages.map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                    blocks: msg.blocks,
                    sequence: msg.sequence,
                })),
            },
        },
    })
}

const findActiveSessionByUser = async (userId: string) => {
    return prisma.session.findFirst({
        where: {
            userId,
            vmStatus: { in: ['RUNNING', 'PROVISIONING'] },
        },
    })
}

export const cliRepository = {
    createSession,
    findActiveSessionByUser,
}
