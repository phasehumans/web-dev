import jwt from 'jsonwebtoken'

import { env } from '../../env'

export const generateAppJwt = (): string => {
    if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
        if (env.NODE_ENV === 'test') {
            return 'mock_test_jwt'
        }
        throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be configured')
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
        iat: now - 60,
        exp: now + 10 * 60,
        iss: env.GITHUB_APP_ID,
    }

    const formattedKey = env.GITHUB_APP_PRIVATE_KEY.includes('-----BEGIN')
        ? env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n')
        : Buffer.from(env.GITHUB_APP_PRIVATE_KEY, 'base64').toString('utf8')

    return jwt.sign(payload, formattedKey, { algorithm: 'RS256' })
}

export const getInstallationDetails = async (installationId: string): Promise<any | null> => {
    try {
        const appJwt = generateAppJwt()
        const response = await fetch(`https://api.github.com/app/installations/${installationId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${appJwt}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        })

        if (!response.ok) {
            return null
        }

        return await response.json()
    } catch {
        // Intentionally swallowed: return null if installation details fetch fails
        return null
    }
}
