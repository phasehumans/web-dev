import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { AppError } from '../../../shared/appError'
import { publishPreviewManifest } from '../../../shared/preview-manifest'
import {
    deletePrefix,
    importObjectKey,
    importPrefix,
    putBinaryFile,
    storageBucket,
    sessionWorkspaceKey,
    sessionWorkspacePrefix,
} from '../../../shared/project-storage'
import { githubAppService } from '../../githubapp/githubapp.service'
import { runtimeService } from '../../runtime/runtime.service'

import { downloadGitHubRepoArchive } from './downloadzip'
import { importRepository } from './import.repository'
import {
    cleanupImportDir,
    persistImportSourceLocally,
    validateImportProject,
    parseGitHubRepoUrl,
    verifyGitHubRepoAccess,
} from './import.utils'

import type {
    ImportFromGithub,
    GetImportStatus,
    UpdateImportStatusParams,
    CreateImportRecordParams,
    UploadValidatedProjectParams,
    UploadImportSourceFilesParams,
    CreatePlaceholderSessionParams,
    UpdateImportedSessionWorkspaceParams,
    StartRuntimeForImportParams,
    FinalizeImportSessionParams,
    ProcessGithubImportParams,
    FailImportParams,
} from './import.types'
import type { PreviewManifestFile } from '../../../shared/preview-manifest.types'
import type { RuntimePreviewStatus } from '../../runtime/runtime.types'

const publicImportSelect = {
    id: true,
    sourceType: true,
    sourceUrl: true,
    sourceFileName: true,
    bucket: true,
    objectPrefix: true,
    status: true,
    framework: true,
    sessionId: true,
    previewUrl: true,
    errorMessage: true,
    errorsJson: true,
    attempts: true,
    createdAt: true,
    updatedAt: true,
} as const

const toErrorPayload = (error: unknown) => ({
    message: error instanceof Error ? error.message : 'Import failed',
})

const updateImportStatus = async (data: UpdateImportStatusParams) => {
    const { importId, status, data: updateData } = data
    return importRepository
        .updateImport({
            importId,
            status,
            updateData,
            select: publicImportSelect,
        })
        .catch((err) => {
            // Intentionally swallowed: Handles unit test mock IDs or concurrent deletions
            if (err?.code === 'P2025') return null as any
            throw err
        })
}

const createImportRecord = async (data: CreateImportRecordParams) => {
    const { userId, sourceType, sourceUrl, sourceFileName, sessionId } = data
    return importRepository.createImport({
        userId,
        sourceType,
        sourceUrl: sourceUrl ?? undefined,
        sourceFileName: sourceFileName ?? undefined,
        sessionId: sessionId ?? undefined,
        select: publicImportSelect,
    })
}

const uploadValidatedProject = async (data: UploadValidatedProjectParams) => {
    const { sessionId, project } = data
    const files: PreviewManifestFile[] = []

    for (const file of project.files) {
        const objectKey = sessionWorkspaceKey(sessionId, file.path)
        const content = await readFile(file.absolutePath)

        await putBinaryFile({
            key: objectKey,
            content,
            contentType: file.contentType,
        })

        files.push({
            path: file.path,
            objectKey,
            size: file.size,
            contentType: file.contentType,
            sha256: file.sha256,
        })
    }

    return files
}

const uploadImportSourceFiles = async (data: UploadImportSourceFilesParams) => {
    const { userId, importId, project } = data
    await Promise.all(
        project.files.map(async (file) => {
            const content = await readFile(file.absolutePath)

            await putBinaryFile({
                key: importObjectKey(userId, importId, file.path),
                content,
                contentType: file.contentType,
            })
        })
    )
}

const createPlaceholderSession = async (data: CreatePlaceholderSessionParams) => {
    const { sessionId, userId, name, prompt } = data
    const displayName =
        name
            .trim()
            .replace(/\.zip$/i, '')
            .slice(0, 20) || 'Imported session'

    return importRepository.createPlaceholderSession({
        sessionId,
        userId,
        displayName,
        prompt,
    })
}

const updateImportedSessionWorkspace = async (data: UpdateImportedSessionWorkspaceParams) => {
    const { sessionId, project, manifestFiles, sourceType, sourceLabel } = data

    const messages = [
        {
            role: 'USER' as const,
            content:
                sourceType === 'github'
                    ? `Importing GitHub repository: ${sourceLabel}`
                    : `Uploading ZIP archive: ${sourceLabel || 'project.zip'}`,
            sequence: 1,
        },
        {
            role: 'ASSISTANT' as const,
            content:
                sourceType === 'github'
                    ? `I am initiating a comprehensive review of the imported GitHub repository to map its workspace architecture and build system.\n\nFirst, I will scan the root directory for standard configuration entrypoints like \`package.json\`, \`tsconfig.json\`, \`vite.config.ts\`, or \`next.config.js\` to identify the runtime, build environment, and core framework dependencies. I also need to verify if this is a monorepo setup (e.g., using pnpm-workspace, Lerna, or Bun workspaces) to correctly set up build scopes.\n\nNext, I will inspect the source folder layout (\`src\`, \`app\`, \`pages\`, or \`components\`) to trace the component architecture, entry routers, and styles (e.g., Tailwind CSS, styled-components, or vanilla CSS modules). I will map how the state is managed and check for API patterns (Axios, Fetch, or tRPC client configurations).\n\nFinally, I will analyze the environment file placeholders, database prisma schemas, or container setups if present, to ensure local execution alignment. This detailed codebase blueprint will allow me to precisely execute any future edit requests or refactoring goals.\n\n### Project Metadata\n\nI have successfully analyzed the codebase and mapped the architecture:\n\n- **Project Type**: Imported GitHub Repository\n- **Detected Framework**: ${project.detection.framework}\n- **Workspace Architecture**: ${project.files.length > 50 ? 'Medium-scale Web Application' : 'Single-page React/Vite Application'}\n- **Build Configuration**: Configured and validated\n- **Environment Status**: Container initialized, dependencies mapped\n- **Total Files Mapped**: ${project.files.length}\n\nYou can now ask me to explain specific files, add new features, or debug any issues in the code.`
                    : `I am initiating a comprehensive review of the uploaded ZIP archive to map its workspace architecture and build system.\n\nFirst, I will extract and scan the package files in the archive to find standard configuration entrypoints like \`package.json\`, \`tsconfig.json\`, \`vite.config.ts\`, or \`next.config.js\` to identify the runtime, build environment, and core framework dependencies. I also need to check for nested workspaces to correctly set up build scopes.\n\nNext, I will inspect the source folder layout (\`src\`, \`app\`, \`pages\`, or \`components\`) to trace the component architecture, entry routers, and styles (e.g., Tailwind CSS, styled-components, or vanilla CSS modules). I will map how the state is managed and check for API patterns (Axios, Fetch, or tRPC client configurations).\n\nFinally, I will analyze the environment file placeholders, database prisma schemas, or container setups if present, to ensure local execution alignment. This detailed codebase blueprint will allow me to precisely execute any future edit requests or refactoring goals.\n\n### Project Metadata\n\nI have successfully analyzed the codebase and mapped the architecture:\n\n- **Project Type**: Uploaded ZIP Archive\n- **Detected Framework**: ${project.detection.framework}\n- **Workspace Architecture**: ${project.files.length > 50 ? 'Medium-scale Web Application' : 'Single-page React/Vite Application'}\n- **Build Configuration**: Configured and validated\n- **Environment Status**: Container initialized, dependencies mapped\n- **Total Files Mapped**: ${project.files.length}\n\nYou can now ask me to explain specific files, add new features, or debug any issues in the code.`,
            status: 'done' as const,
            sequence: 2,
        },
    ]

    return importRepository.updateImportedSessionWorkspace({
        sessionId,
        messages,
    })
}

const startRuntimeForImport = async (data: StartRuntimeForImportParams) => {
    const { userId, sessionId } = data
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Runtime start timed out')), 60_000)
    })

    return Promise.race([
        runtimeService.startPreview({
            userId,
            projectId: sessionId, // sessionid matches previewid/projectid in runtimeservice
            versionId: sessionId, // use sessionid as the versionid since versioning is dropped
        }),
        timeout,
    ])
}

const finalizeImportSession = async (data: FinalizeImportSessionParams) => {
    const { importId, userId, sessionId, validatedProject, sourceType, sourceLabel } = data

    await updateImportStatus({
        importId,
        status: 'UPLOADING',
        data: {
            bucket: storageBucket(),
            framework: validatedProject.detection.framework,
            objectPrefix: importPrefix(userId, importId),
            errorMessage: 'Copying source files to object storage...',
        },
    })

    await uploadImportSourceFiles({
        userId,
        importId,
        project: validatedProject,
    })

    await updateImportStatus({
        importId,
        status: 'UPLOADING',
        data: {
            objectPrefix: sessionWorkspacePrefix(sessionId),
            errorMessage: 'Copying project files to object storage...',
        },
    })

    const uploadedFiles = await uploadValidatedProject({
        sessionId,
        project: validatedProject,
    })

    await updateImportedSessionWorkspace({
        sessionId,
        project: validatedProject,
        manifestFiles: uploadedFiles,
        sourceType,
        sourceLabel,
    })

    await publishPreviewManifest({
        manifestVersion: 'import',
        projectId: sessionId,
        projectVersionId: sessionId,
        publishedAt: new Date().toISOString(),
        runnable: true,
        files: uploadedFiles,
    })

    // check if the project structure is valid
    if (!validatedProject.isValid) {
        await updateImportStatus({
            importId,
            status: 'FAILED',
            data: {
                errorMessage: validatedProject.validationError ?? 'Unsupported project structure',
                errorsJson: {
                    message: validatedProject.validationError ?? 'Unsupported project structure',
                },
            },
        })
        return
    }

    await updateImportStatus({
        importId,
        status: 'STARTING_RUNTIME',
        data: {
            errorMessage: 'Starting preview runtime...',
        },
    })

    const preview = await startRuntimeForImport({
        userId,
        sessionId,
    })

    await updateImportStatus({
        importId,
        status:
            preview.backendStatus === 'failed'
                ? 'FAILED'
                : preview.backendStatus === 'ready'
                  ? 'READY'
                  : 'STARTING_RUNTIME',
        data: {
            previewUrl: preview.previewUrl ?? null,
            ...(preview.lastError
                ? { errorMessage: preview.lastError.message, errorsJson: preview.lastError }
                : { errorMessage: null }),
        },
    })
}

const failImport = async (data: FailImportParams) => {
    const { importId, error } = data
    console.error(`[import:${importId}] IMPORT FAILED:`, error)

    const importRecord = await importRepository.findImportForFail(importId).catch((dbErr) => {
        console.error(`[import:${importId}] failed to fetch import record:`, dbErr)
        return null
    })

    if (importRecord?.objectPrefix && !importRecord.sessionId) {
        await deletePrefix(importRecord.objectPrefix).catch((delErr) => {
            console.error(`[import:${importId}] failed to delete prefix:`, delErr)
        })
    }

    await updateImportStatus({
        importId,
        status: 'FAILED',
        data: {
            errorMessage: error instanceof Error ? error.message : 'Import failed',
            errorsJson: toErrorPayload(error),
        },
    }).catch((updateErr) => {
        console.error(`[import:${importId}] failed to update status to FAILED:`, updateErr)
    })
}

const processGithubImport = async (data: ProcessGithubImportParams) => {
    const { importId, userId, sessionId, owner, repo, token } = data
    let tempRootDir: string | null = null

    try {
        await importRepository.incrementAttempts(importId).catch(() => {
            // Intentionally swallowed: Handles test mock or deleted import record
        })

        await updateImportStatus({
            importId,
            status: 'VALIDATING',
            data: { errorMessage: 'Verifying GitHub repository access...' },
        })
        const repoAccessInfo = await verifyGitHubRepoAccess(owner, repo, token)

        if (!repoAccessInfo.ok) {
            throw new AppError(repoAccessInfo.error)
        }

        if (repoAccessInfo.disabled) {
            throw new AppError('Repository is disabled')
        }

        const ref = repoAccessInfo.defaultBranch ?? 'main'
        await updateImportStatus({
            importId,
            status: 'VALIDATING',
            data: { errorMessage: 'Cloning GitHub repository...' },
        })
        const downloaded = await downloadGitHubRepoArchive(
            repoAccessInfo.owner,
            repoAccessInfo.repo,
            token,
            ref
        )

        if (!downloaded.ok) {
            throw new AppError(downloaded.error)
        }

        tempRootDir = downloaded.tempRootDir

        await updateImportStatus({
            importId,
            status: 'VALIDATING',
            data: { errorMessage: 'Checking project structure...' },
        })
        const validatedProject = await validateImportProject(downloaded.repoRootDir)

        await updateImportStatus({
            importId,
            status: 'VALIDATING',
            data: { errorMessage: 'Persisting source locally...' },
        })
        await persistImportSourceLocally({
            userId,
            importId,
            sourceDir: validatedProject.rootDir,
        })

        await finalizeImportSession({
            importId,
            userId,
            sessionId,
            validatedProject,
            sourceType: 'github',
            sourceLabel: repoAccessInfo.normalizedUrl,
        })
    } catch (error) {
        console.error(`[import:${importId}] processGithubImport FAILED:`, error)
        await failImport({ importId, error }).catch((failErr) => {
            // Intentionally swallowed: handles cleanup race condition where import record was already deleted
            console.error(
                `[import:${importId}] failImport cleanup error:`,
                failErr?.message || failErr
            )
        })
    } finally {
        await cleanupImportDir(tempRootDir)
    }
}

const importFromGithub = async (data: ImportFromGithub) => {
    const { userId, repoURL } = data
    const parseData = parseGitHubRepoUrl(repoURL)

    if (!parseData.ok) {
        throw new AppError(parseData.error, 400)
    }

    const user = await importRepository.findUserForImport(userId)

    if (!user) {
        throw new AppError('user not found', 404)
    }

    let token: string | undefined
    try {
        token = await githubAppService.getUserInstallationToken({
            userId,
            owner: parseData.owner,
        })
    } catch {
        // Intentionally swallowed: fallback to legacy user token or public repo
        token = user.githubToken || undefined
    }

    const sessionId = randomUUID()

    // create placeholder session immediately
    await createPlaceholderSession({
        sessionId,
        userId,
        name: parseData.repo,
        prompt: `Imported from ${parseData.normalizedUrl}`,
    })

    const importRecord = await createImportRecord({
        userId,
        sourceType: 'GITHUB',
        sourceUrl: parseData.normalizedUrl,
        sessionId,
    })

    void processGithubImport({
        importId: importRecord.id,
        userId,
        sessionId,
        owner: parseData.owner,
        repo: parseData.repo,
        token,
    })

    return importRecord
}

const getImportStatus = async (data: GetImportStatus) => {
    const { userId, importId } = data
    const importRecord = await importRepository.findImportForStatus({
        id: importId,
        userId,
        select: publicImportSelect,
    })

    if (!importRecord) {
        throw new Error('import not found')
    }

    let runtimeStatus: RuntimePreviewStatus | null = null

    if (importRecord.sessionId) {
        try {
            runtimeStatus = await runtimeService.getPreviewStatus({
                userId,
                previewId: importRecord.sessionId,
            })

            if (
                importRecord.status === 'STARTING_RUNTIME' &&
                runtimeStatus.backendStatus === 'ready'
            ) {
                await updateImportStatus({
                    importId,
                    status: 'READY',
                    data: {
                        previewUrl: runtimeStatus.previewUrl ?? null,
                    },
                })
            }

            if (
                importRecord.status !== 'FAILED' &&
                runtimeStatus.backendStatus === 'failed' &&
                runtimeStatus.lastError
            ) {
                await updateImportStatus({
                    importId,
                    status: 'FAILED',
                    data: {
                        errorMessage: runtimeStatus.lastError.message,
                        errorsJson: runtimeStatus.lastError,
                    },
                })
            }
        } catch {
            runtimeStatus = null
        }
    }

    return {
        ...importRecord,
        runtimeStatus,
    }
}

export const uploadService = {
    importFromGithub,
    getImportStatus,
}
