import { prisma } from '@december/database'

import type { CreateCliSession } from './cli.types'

const createSession = async (data: CreateCliSession) => {
    const { userId, title, messages, minioPrefix } = data
    return prisma.session.create({
        data: {
            userId,
            title,
            type: 'CLI',
            minioPrefix,
            messages: {
                create: messages.map((msg: any, i: number) => ({
                    role:
                        msg.role === 'assistant'
                            ? 'ASSISTANT'
                            : msg.role === 'system'
                              ? 'SYSTEM'
                              : 'USER',
                    content:
                        typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                    sequence: i,
                })),
            },
        },
    })
}

export const cliRepository = {
    createSession,
}
