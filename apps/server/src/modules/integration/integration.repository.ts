import { prisma } from '@december/database'

async function findUserById(id: string) {
    return prisma.user.findUnique({
        where: { id },
    })
}

async function findUserFirst(id: string) {
    return prisma.user.findFirst({
        where: { id },
    })
}

async function updateUserVercel(data: {
    id: string
    vercelAccessToken: string
    vercelTeamId: string | null
    vercelConfigurationId: string | null
}) {
    const { id, vercelAccessToken, vercelTeamId, vercelConfigurationId } = data
    return prisma.user.update({
        where: { id },
        data: {
            vercelConnected: true,
            vercelAccessToken,
            vercelTeamId,
            vercelConfigurationId,
        },
    })
}

async function updateUserSupabase(data: {
    id: string
    supabaseAccessToken: string
    supabaseRefreshToken: string
    supabaseTokenExpiresAt: Date
    supabaseTokenScope: string | null
}) {
    const {
        id,
        supabaseAccessToken,
        supabaseRefreshToken,
        supabaseTokenExpiresAt,
        supabaseTokenScope,
    } = data
    return prisma.user.update({
        where: { id },
        data: {
            supabaseConnected: true,
            supabaseAccessToken,
            supabaseRefreshToken,
            supabaseTokenExpiresAt,
            supabaseTokenScope,
            supabaseConnectedAt: new Date(),
        },
    })
}

async function updateUserNotion(data: {
    id: string
    notionAccessToken: string
    notionWorkspaceId: string
    notionWorkspaceName: string
}) {
    const { id, notionAccessToken, notionWorkspaceId, notionWorkspaceName } = data
    return prisma.user.update({
        where: { id },
        data: {
            notionAccessToken,
            notionWorkspaceId,
            notionWorkspaceName,
        },
    })
}

async function updateUserGithub(data: { id: string; username: string; accessToken: string }) {
    const { id, username, accessToken } = data
    return prisma.user.update({
        where: { id },
        data: {
            githubUsername: username,
            githubToken: accessToken,
            githubConnected: true,
        },
        select: {
            id: true,
            githubConnected: true,
            githubAppInstall: true,
            githubUsername: true,
        },
    })
}

export const integrationRepository = {
    findUserById,
    findUserFirst,
    updateUserVercel,
    updateUserSupabase,
    updateUserNotion,
    updateUserGithub,
}
