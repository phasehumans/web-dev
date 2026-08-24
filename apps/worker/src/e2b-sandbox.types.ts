export interface ProvisionSandboxInput {
    sessionId: string
    userId?: string
    apiKey?: string
    template?: string
    timeoutMs?: number
    backoffDelays?: number[]
}

export interface ProvisionSandboxResult {
    sandboxId: string
    isMock: boolean
}

export interface ExecuteSandboxCommandInput {
    sandboxId: string
    command: string
    cwd?: string
    timeoutMs?: number
    onData?: (chunk: string) => void
}

export interface ExecuteSandboxCommandResult {
    exitCode: number
    output: string
}

export interface RunAgentSessionInput {
    sessionId: string
    sandboxId?: string
    prompt: string
    workspaceDir?: string
    token?: string
    apiHostUrl?: string
}

export interface DestroySandboxInput {
    sandboxId: string
}

export interface EmitSessionEventInput {
    sessionId: string
    event: Record<string, any>
}

export interface PauseSandboxInput {
    sessionId: string
    sandboxId?: string
}

export interface ResumeSandboxInput {
    sessionId: string
    snapshotId?: string
}

export interface HandleDisconnectInput {
    sessionId: string
    gracePeriodMs?: number
}

export interface EphemeralTaskInput {
    sessionId?: string
    taskType: 'pr_review' | 'security_audit' | 'one_click_fix'
    repoUrl?: string
    gitToken?: string
    taskRunner?: (sandbox: any) => Promise<any>
}

export interface EphemeralTaskResult {
    success: boolean
    data?: any
    error?: string
}
