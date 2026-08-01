import { prisma } from '@december/database'

export const runtimeRepository = {
    async updateSessionPreviewImage(data: { sessionId: string; key: string }) {
        // no previewimagekey field in session schema, we keep the image in s3
    },

    async findSessionForStart(data: { sessionId: string; userId: string }) {
        const { sessionId, userId } = data
        return prisma.session.findFirst({
            where: {
                id: sessionId,
                OR: [
                    { userId },
                    { collaborators: { some: { userId } } },
                ],
            },
            select: {
                id: true,
                githubRepoUrl: true,
                vmStatus: true,
                updatedAt: true,
            },
        })
    },

    async findSessionForPreview(data: { sessionId: string; userId: string }) {
        return this.findSessionForStart(data)
    },

    async findSessionImport(data: { sessionId: string }) {
        const { sessionId } = data
        return prisma.sessionImport.findFirst({
            where: { sessionId },
        })
    },

    async findSessionForStatus(data: { previewId: string; userId: string }) {
        const { previewId, userId } = data
        return prisma.session.findFirst({
            where: {
                id: previewId,
                OR: [
                    { userId },
                    { collaborators: { some: { userId } } },
                ],
            },
            select: {
                id: true,
                vmStatus: true,
                updatedAt: true,
            },
        })
    },

    async findSessionForDelete(data: { previewId: string; userId: string }) {
        const { previewId, userId } = data
        return prisma.session.findFirst({
            where: {
                id: previewId,
                OR: [
                    { userId },
                    { collaborators: { some: { userId } } },
                ],
            },
            select: {
                id: true,
                vmStatus: true,
                updatedAt: true,
            },
        })
    },
}
