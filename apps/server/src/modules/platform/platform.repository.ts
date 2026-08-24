import { prisma } from '@december/database'

async function findSessionForDeployment(data: { sessionId: string; userId: string }) {
    const { sessionId, userId } = data
    return prisma.session.findFirst({
        where: {
            id: sessionId,
            userId,
        },
    })
}

async function getVercelCredentials(data: { userId: string }) {
    const { userId } = data
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            vercelAccessToken: true,
            vercelTeamId: true,
            vercelConnected: true,
        },
    })
}

async function findSessionById(data: { sessionId: string }) {
    const { sessionId } = data
    return prisma.session.findUnique({
        where: { id: sessionId },
    })
}

async function updateSessionVercelLink(data: {
    sessionId: string
    vercelProjectId: string
    vercelProjectName: string
}) {
    const { sessionId, vercelProjectId, vercelProjectName } = data
    return prisma.session.update({
        where: { id: sessionId },
        data: {
            vercelProjectId,
            vercelProjectName,
        },
    })
}

async function updateSessionVercelDeployment(data: { sessionId: string; url: string }) {
    const { sessionId, url } = data
    return prisma.session.update({
        where: { id: sessionId },
        data: {
            vercelDeploymentUrl: url,
            vercelLastDeployedAt: new Date(),
        },
    })
}

async function findUserGithubConnection(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            githubToken: true,
            githubUsername: true,
            githubConnected: true,
            githubAppInstall: true,
        },
    })
}

async function findSessionByIdAndUser(data: { sessionId: string; userId: string }) {
    const { sessionId, userId } = data
    return prisma.session.findFirst({
        where: {
            id: sessionId,
            OR: [{ userId }, { collaborators: { some: { userId } } }],
        },
    })
}

async function updateSessionGithub(data: {
    sessionId: string
    githubRepoName: string
    githubRepoOwner: string
    githubRepoUrl: string
}) {
    const { sessionId, githubRepoName, githubRepoOwner, githubRepoUrl } = data
    return prisma.session.update({
        where: { id: sessionId },
        data: {
            githubRepoName,
            githubRepoOwner,
            githubRepoUrl,
        },
    })
}

async function updateSessionSynced(sessionId: string) {
    return prisma.session.update({
        where: { id: sessionId },
        data: {
            githubLastSyncedAt: new Date(),
        },
    })
}

async function unlinkSessionGithub(sessionId: string) {
    return prisma.session.update({
        where: { id: sessionId },
        data: {
            githubRepoName: null,
            githubRepoOwner: null,
            githubRepoUrl: null,
            githubLastSyncedAt: null,
        },
    })
}

async function unlinkSessionVercel(sessionId: string) {
    return prisma.session.update({
        where: { id: sessionId },
        data: {
            vercelProjectId: null,
            vercelProjectName: null,
            vercelDeploymentUrl: null,
            vercelLastDeployedAt: null,
        },
    })
}

async function getSessionMemories(sessionId: string) {
    return prisma.sessionMemory.findMany({
        where: { sessionId },
    })
}

export const platformRepository = {
    findSessionForDeployment,
    getVercelCredentials,
    findSessionById,
    updateSessionVercelLink,
    updateSessionVercelDeployment,
    findUserGithubConnection,
    findSessionByIdAndUser,
    updateSessionGithub,
    updateSessionSynced,
    unlinkSessionGithub,
    unlinkSessionVercel,
    getSessionMemories,
}
