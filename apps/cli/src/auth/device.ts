import { openUrl } from '../utils/open'

export async function loginViaDeviceCode(
    baseUrl: string = process.env.SERVER_URL ||
        process.env.WEB_URL ||
        'https://api.trydecember.com',
    onCodeGenerated: (userCode: string, verificationUri: string) => void
): Promise<{ token: string; email: string | null }> {
    try {
        const genRes = await fetch(`${baseUrl}/api/v1/auth/device/code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })

        let genData: any = {}
        try {
            genData = await genRes.json()
        } catch {
            // Intentionally swallowed: fallback handled if server returns non-JSON
        }

        if (!genRes.ok || !genData.success) {
            throw new Error(genData.message || `Failed to generate device code (${genRes.status})`)
        }

        const { deviceCode, userCode, verificationUri, expiresIn, interval } = genData.data

        onCodeGenerated(userCode, verificationUri)

        // Auto-open browser after 5 seconds
        setTimeout(() => {
            openUrl(verificationUri).catch(() => {
                // Intentionally swallowed: fallback handled if browser cannot be opened in headless/SSH environment
            })
        }, 5000)

        // 2. poll for token
        const startTime = Date.now()
        const pollInterval = interval * 1000 || 5000

        return await new Promise((resolve, reject) => {
            const poll = async () => {
                if (Date.now() - startTime > expiresIn * 1000) {
                    reject(new Error('Device code expired'))
                    return
                }

                try {
                    const tokenRes = await fetch(`${baseUrl}/api/v1/auth/device/token`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ deviceCode }),
                    })

                    const tokenData = (await tokenRes.json()) as any

                    if (tokenRes.ok && tokenData.success) {
                        resolve({
                            token: tokenData.data.token,
                            email: tokenData.data.email,
                        })
                        return
                    }

                    // if not ok, check if it's authorization_pending
                    if (tokenData.message === 'authorization_pending') {
                        setTimeout(poll, pollInterval)
                    } else {
                        reject(new Error(tokenData.message || 'Polling failed'))
                    }
                } catch (err) {
                    // network errors during polling, just keep trying
                    setTimeout(poll, pollInterval)
                }
            }

            setTimeout(poll, pollInterval)
        })
    } catch (err: any) {
        const msg = err?.message || String(err)
        if (
            msg.includes('fetch failed') ||
            msg.includes('ECONNREFUSED') ||
            msg.includes('ENOTFOUND') ||
            msg.includes('Failed to fetch') ||
            msg.includes('connect')
        ) {
            throw new Error('Unable to connect. Is the computer able to access the url?', {
                cause: err,
            })
        } else {
            throw err
        }
    }
}
