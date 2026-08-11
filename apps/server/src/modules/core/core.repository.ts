import { prisma } from '@december/database'

const findSessionById = async (data: { sessionId: string; userId: string }) => {
    const { sessionId, userId } = data
    return prisma.session.findFirst({
        where: {
            id: sessionId,
            OR: [{ userId }, { collaborators: { some: { userId } } }],
        },
    })
}

const createSessionWithPrompt = async (data: {
    userId: string
    prompt: string
    projectId?: string
}) => {
    const { userId, prompt, projectId } = data
    return prisma.session.create({
        data: {
            userId,
            projectId,
            title: prompt.slice(0, 50),
            type: 'WEB',
            messages: {
                create: {
                    role: 'USER',
                    content: prompt,
                    sequence: 1,
                },
            },
        },
    })
}

export const coreRepository = {
    findSessionById,
    createSessionWithPrompt,
}
