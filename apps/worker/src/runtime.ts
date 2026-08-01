import { E2BSandboxService } from './e2b-sandbox.service'

export async function createVM(vmId: string, workspaceZipUrl?: string): Promise<boolean> {
    const result = await E2BSandboxService.provisionSandbox({
        sessionId: vmId,
    })
    return !!result.sandboxId
}

export async function destroyVM(vmId: string): Promise<boolean> {
    return E2BSandboxService.destroySandbox({ sandboxId: vmId })
}

export function startAgentSession(
    sessionId: string,
    workspaceDir: string,
    systemPrompt: string,
    token: string,
    apiHostUrl: string
): any {
    return E2BSandboxService.runAgentSession({
        sessionId,
        prompt: systemPrompt,
        workspaceDir,
        token,
        apiHostUrl,
    })
}

export async function executeCommand(
    vmId: string,
    command: string,
    onData: (chunk: string) => void
): Promise<number> {
    const result = await E2BSandboxService.executeCommand({
        sandboxId: vmId,
        command,
        onData,
    })
    return result.exitCode
}
