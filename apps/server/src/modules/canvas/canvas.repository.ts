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

export const canvasRepository = {
    findSessionAccess,
}
