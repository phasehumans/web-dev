import https from 'node:https'

import { loadConfig, saveConfig } from '../config'

export const CHECK_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export function isNewerVersion(current: string, latest: string): boolean {
    const cleanCurrent = current.replace(/^v/, '')
    const cleanLatest = latest.replace(/^v/, '')
    const p1 = cleanCurrent.split('.').map((n) => Number(n) || 0)
    const p2 = cleanLatest.split('.').map((n) => Number(n) || 0)

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const v1 = p1[i] ?? 0
        const v2 = p2[i] ?? 0
        if (v2 > v1) return true
        if (v1 > v2) return false
    }
    return false
}

export async function checkForLatestVersion(currentVersion: string): Promise<string | null> {
    try {
        const config = await loadConfig()
        const now = Date.now()

        // 1. Check local config cache first (24-hour TTL)
        if (config.versionCheckCache) {
            const { latestVersion, checkedAt } = config.versionCheckCache
            if (now - checkedAt < CHECK_TTL_MS) {
                if (latestVersion && isNewerVersion(currentVersion, latestVersion)) {
                    return latestVersion
                }
                return null
            }
        }

        // 2. Fetch from npm registry if cache is stale (> 24 hours) or missing
        const freshLatest = await fetchLatestFromNpm()
        if (freshLatest) {
            config.versionCheckCache = {
                latestVersion: freshLatest,
                checkedAt: now,
            }
            await saveConfig(config).catch(() => {})

            if (isNewerVersion(currentVersion, freshLatest)) {
                return freshLatest
            }
        }
    } catch {
        // Fallback gracefully on config read or network error
    }

    return null
}

export function fetchLatestFromNpm(): Promise<string | null> {
    return new Promise((resolve) => {
        const req = https.get(
            'https://registry.npmjs.org/@trydecember/cli/latest',
            { timeout: 1200 },
            (res) => {
                if (res.statusCode !== 200) {
                    resolve(null)
                    return
                }
                let data = ''
                res.on('data', (chunk) => {
                    data += chunk
                })
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data)
                        const latest = parsed.version
                        if (latest && typeof latest === 'string') {
                            resolve(latest)
                        } else {
                            resolve(null)
                        }
                    } catch {
                        resolve(null)
                    }
                })
            }
        )

        req.on('error', () => resolve(null))
        req.on('timeout', () => {
            req.destroy()
            resolve(null)
        })
    })
}

export async function clearVersionCheckCache(): Promise<void> {
    try {
        const config = await loadConfig()
        if (config.versionCheckCache) {
            delete config.versionCheckCache
            await saveConfig(config)
        }
    } catch {
        // ignore errors clearing cache
    }
}
