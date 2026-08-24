import type { PreviewManifestFile } from '../../../shared/preview-manifest.types'

export type ImportFromGithub = {
    userId: string
    repoURL: string
}

export type GetImportStatus = {
    userId: string
    importId: string
}

export type ImportSource = 'GITHUB'

export type ImportStatus =
    | 'PENDING'
    | 'VALIDATING'
    | 'UPLOADING'
    | 'STARTING_RUNTIME'
    | 'READY'
    | 'FAILED'

export type ImportValidationFile = {
    absolutePath: string
    path: string
    size: number
    contentType: string
    sha256: string
}

export type ProjectDetection = {
    framework: string
    packageJson: Record<string, any>
}

export type ValidatedImportProject = {
    rootDir: string
    files: ImportValidationFile[]
    totalBytes: number
    detection: ProjectDetection
    isValid: boolean
    validationError?: string | null
}

export type DownloadedGitHubRepoArchive =
    | {
          ok: true
          owner: string
          repo: string
          ref: string | null
          zipUrl: string
          tempRootDir: string
          zipFilePath: string
          extractDir: string
          repoRootDir: string
      }
    | {
          ok: false
          error: string
          code:
              | 'DOWNLOAD_FAILED'
              | 'UNAUTHORIZED'
              | 'RATE_LIMITED'
              | 'NETWORK_ERROR'
              | 'EXTRACT_FAILED'
              | 'EMPTY_ARCHIVE'
      }

export type ParsedGitHubRepo =
    | {
          ok: true
          owner: string
          repo: string
          normalizedUrl: string
      }
    | {
          ok: false
          error: string
          code: 'EMPTY_INPUT' | 'INVALID_URL' | 'NOT_GITHUB' | 'NOT_REPO_URL'
      }

export type VerifiedGitHubRepoAccess =
    | {
          ok: true
          owner: string
          repo: string
          normalizedUrl: string
          cloneUrl: string
          defaultBranch: string | null
          archived: boolean
          disabled: boolean
          visibility: 'public' | 'private'
          canAccess: true
      }
    | {
          ok: false
          error: string
          code: 'NOT_FOUND_OR_NO_ACCESS' | 'RATE_LIMITED' | 'GITHUB_API_ERROR' | 'NETWORK_ERROR'
      }

export type UpdateImportStatusParams = {
    importId: string
    status: ImportStatus
    data?: Record<string, any>
}

export type CreateImportRecordParams = {
    userId: string
    sourceType: ImportSource
    sourceUrl?: string | null
    sourceFileName?: string | null
    sessionId?: string | null
}

export type UploadValidatedProjectParams = {
    sessionId: string
    project: ValidatedImportProject
}

export type UploadImportSourceFilesParams = {
    userId: string
    importId: string
    project: ValidatedImportProject
}

export type CreatePlaceholderSessionParams = {
    sessionId: string
    userId: string
    name: string
    prompt: string
}

export type UpdateImportedSessionWorkspaceParams = {
    sessionId: string
    project: ValidatedImportProject
    manifestFiles: PreviewManifestFile[]
    sourceType: 'github' | 'zip'
    sourceLabel?: string
}

export type StartRuntimeForImportParams = {
    userId: string
    sessionId: string
}

export type FinalizeImportSessionParams = {
    importId: string
    userId: string
    sessionId: string
    validatedProject: ValidatedImportProject
    sourceType: 'github' | 'zip'
    sourceLabel?: string
}

export type ProcessGithubImportParams = {
    importId: string
    userId: string
    sessionId: string
    owner: string
    repo: string
    token?: string
}

export type FailImportParams = {
    importId: string
    error: unknown
}

export type PersistentImportSourceDir = {
    userId: string
    importId: string
}

export type PersistImportSourceLocally = {
    userId: string
    importId: string
    sourceDir: string
}

export type GitHubRepoApiResponse = {
    name?: string
    html_url?: string
    clone_url?: string
    default_branch?: string
    private?: boolean
    archived?: boolean
    disabled?: boolean
    owner?: {
        login?: string
    }
}
