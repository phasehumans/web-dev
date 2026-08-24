import { exec } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { importStagingRootDir } from './import.utils'

import type { DownloadedGitHubRepoArchive } from './import.types'

const execAsync = promisify(exec)

export async function downloadGitHubRepoArchive(
    owner: string,
    repo: string,
    accessToken?: string,
    ref?: string
): Promise<DownloadedGitHubRepoArchive> {
    const resolvedRef = ref ?? null
    const tempRootDir = join(importStagingRootDir(), `github-${owner}-${repo}-${randomUUID()}`)
    const cloneUrl = accessToken
        ? `https://x-access-token:${accessToken}@github.com/${owner}/${repo}.git`
        : `https://github.com/${owner}/${repo}.git`

    try {
        await mkdir(tempRootDir, { recursive: true })

        // execute git clone
        const cloneCommand = resolvedRef
            ? `git clone --depth 1 -b ${resolvedRef} ${cloneUrl} "${tempRootDir}"`
            : `git clone --depth 1 ${cloneUrl} "${tempRootDir}"`

        try {
            await execAsync(cloneCommand)
        } catch (err: any) {
            // if it fails with a specific ref, fallback to default clone
            if (resolvedRef) {
                await execAsync(`git clone --depth 1 ${cloneUrl} "${tempRootDir}"`)
            } else {
                throw err
            }
        }

        // remove the .git directory so it doesn't get validated/uploaded
        await rm(join(tempRootDir, '.git'), { recursive: true, force: true }).catch(() => undefined)

        return {
            ok: true,
            owner,
            repo,
            ref: resolvedRef,
            zipUrl: '',
            tempRootDir,
            zipFilePath: '',
            extractDir: tempRootDir,
            repoRootDir: tempRootDir,
        }
    } catch (error: any) {
        // remove token from output
        const sanitizedError = error.message
            ? error.message.replace(accessToken, '***')
            : 'Git clone failed'
        console.error(`[git-clone] FAILED for ${owner}/${repo}:`, sanitizedError)
        return {
            ok: false,
            error: sanitizedError,
            code: 'DOWNLOAD_FAILED',
        }
    }
}
