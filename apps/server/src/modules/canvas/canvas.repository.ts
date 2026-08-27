import { prisma } from '@december/database'

import type { SessionAccessParam } from './canvas.types'

const findSessionAccess = async (data: SessionAccessParam) => {
    const { sessionId, projectId, userId } = data
    if (!sessionId && !projectId) return null

    return prisma.session.findFirst({
        where: {
            ...(sessionId ? { id: sessionId } : {}),
            ...(projectId ? { projectId } : {}),
            OR: [{ userId }, { collaborators: { some: { userId } } }],
        },
        select: {
            id: true,
        },
    })
}

const updateCanvasWaitlist = async (data: { userId: string }) => {
    const { userId } = data
    return prisma.user.update({
        where: { id: userId },
        data: { canvasWaitlist: true },
        select: {
            id: true,
            canvasWaitlist: true,
        },
    })
}

export const canvasRepository = {
    findSessionAccess,
    updateCanvasWaitlist,
}
