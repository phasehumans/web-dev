// Clean sandbox execution interface placeholder (E2B sandbox engine implemented in Ticket #314)

export async function createVM(vmId: string, workspaceZipUrl?: string): Promise<boolean> {
    console.log(`[Worker] Sandbox create requested for session ${vmId}`)
    return true
}

export async function destroyVM(vmId: string): Promise<boolean> {
    console.log(`[Worker] Sandbox destroy requested for session ${vmId}`)
    return true
}

export function startAgentSession(
    sessionId: string,
    workspaceDir: string,
    systemPrompt: string,
    token: string,
    apiHostUrl: string
): any {
    console.log(`[Worker] Starting agent session for ${sessionId}`)
    return (async function* () {})()
}

export async function executeCommand(
    vmId: string,
    command: string,
    onData: (chunk: string) => void
): Promise<number> {
    console.log(`[Worker] Executing command on sandbox ${vmId}: ${command}`)
    return 0
}
