import axios from 'axios'

import { AppError } from '../../shared/appError'
import { notificationService } from '../notification/notification.service'

import { integrationRepository } from './integration.repository'

import type {
    ConnectVercel,
    ConnectSupabase,
    ConnectNotion,
    ConnectGithub,
    HandleGitHubOAuth,
} from './integration.types'

const connectVercel = async (data: ConnectVercel) => {
    const { code, userId, teamId, configurationId } = data

    const existingUser = await integrationRepository.findUserFirst(userId)

    if (!existingUser || existingUser.isDeleted == true) {
        throw new AppError('user not found', 404)
    }

    const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },

        body: new URLSearchParams({
            client_id: process.env.VERCEL_CLIENT_ID!,
            client_secret: process.env.VERCEL_CLIENT_SECRET!,
            code,
            redirect_uri: process.env.VERCEL_REDIRECT_URI!,
        }).toString(),
    })

    const rawResponse = await tokenResponse.text()

    if (!tokenResponse.ok) {
        throw new AppError(rawResponse, 400)
    }

    const tokenData = JSON.parse(rawResponse) as { access_token?: string }

    const accessToken = tokenData.access_token

    if (!accessToken) {
        throw new AppError('vercel access token missing', 400)
    }

    const updatedUser = await integrationRepository.updateUserVercel({
        id: userId,
        vercelAccessToken: accessToken,
        vercelTeamId: teamId ?? null,
        vercelConfigurationId: configurationId ?? null,
    })

    try {
        await notificationService.sendNotificationToUser({
            userId,
            title: 'Vercel Connected',
            message: 'Successfully connected with Vercel integration!',
            type: 'SUCCESS',
        })
    } catch (error) {
        console.error('Failed to send vercel connection notification:', error)
    }

    return updatedUser
}

const connectSupabase = async (data: ConnectSupabase) => {
    const { userId, code } = data

    const existingUser = await integrationRepository.findUserFirst(userId)

    if (!existingUser || existingUser.isDeleted == true) {
        throw new AppError('user not found', 404)
    }

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SUPABASE_REDIRECT_URI!,
        client_id: process.env.SUPABASE_CLIENT_ID!,
        client_secret: process.env.SUPABASE_CLIENT_SECRET!,
    })

    const response = await axios.post('https://api.supabase.com/v1/oauth/token', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    const tokenData = response.data

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    const updatedUser = await integrationRepository.updateUserSupabase({
        id: userId,
        supabaseAccessToken: tokenData.access_token,
        supabaseRefreshToken: tokenData.refresh_token,
        supabaseTokenExpiresAt: expiresAt,
        supabaseTokenScope: tokenData.scope || null,
    })

    try {
        await notificationService.sendNotificationToUser({
            userId,
            title: 'Supabase Connected',
            message: 'Successfully connected with Supabase integration!',
            type: 'SUCCESS',
        })
    } catch (error) {
        console.error('Failed to send supabase connection notification:', error)
    }

    return updatedUser
}

const connectNotion = async (data: ConnectNotion) => {
    const { userId, code } = data

    const existingUser = await integrationRepository.findUserFirst(userId)

    if (!existingUser || existingUser.isDeleted == true) {
        throw new AppError('user not found', 404)
    }

    const response = await axios.post(
        'https://api.notion.com/v1/oauth/token',
        {
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.NOTION_REDIRECT_URI!,
        },
        {
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
                ).toString('base64')}`,
                'Content-Type': 'application/json',
            },
        }
    )

    const notionData = response.data

    const updatedUser = await integrationRepository.updateUserNotion({
        id: userId,
        notionAccessToken: notionData.access_token,
        notionWorkspaceId: notionData.workspace_id,
        notionWorkspaceName: notionData.workspace_name,
    })

    try {
        await notificationService.sendNotificationToUser({
            userId,
            title: 'Notion Connected',
            message: `Successfully connected with Notion integration (${notionData.workspace_name})!`,
            type: 'SUCCESS',
        })
    } catch (error) {
        console.error('Failed to send notion connection notification:', error)
    }

    return updatedUser
}

const connectGithub = async (data: ConnectGithub) => {
    const { username, accessToken, userId } = data

    const existingUser = await integrationRepository.findUserFirst(userId)

    if (!existingUser || existingUser.isDeleted == true) {
        throw new AppError('user not found', 404)
    }

    try {
        const updatedUser = await integrationRepository.updateUserGithub({
            id: userId,
            username,
            accessToken,
        })

        try {
            await notificationService.sendNotificationToUser({
                userId,
                title: 'GitHub Connected',
                message: `Successfully connected with GitHub integration as @${username}!`,
                type: 'SUCCESS',
            })
        } catch (error) {
            console.error('Failed to send github connection notification:', error)
        }

        return updatedUser
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw new AppError('user not found', 404)
        }
        throw error
    }
}

const handleGitHubOAuth = async (data: HandleGitHubOAuth) => {
    const { code, userId } = data
    type GithubTokenResponse = {
        access_token: string
        token_type: string
        scope: string
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
        }),
    })

    const tokenData = (await tokenResponse.json()) as GithubTokenResponse
    const accessToken = tokenData.access_token

    const userRes = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })

    const githubUser: any = await userRes.json()
    const username = githubUser.login

    return connectGithub({ userId, accessToken, username })
}

export const integrationsService = {
    connectVercel,
    connectSupabase,
    connectNotion,
    connectGithub,
    handleGitHubOAuth,
}
