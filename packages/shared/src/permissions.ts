export type PermissionTier = 'safe' | 'modifying' | 'destructive'

export interface OperationClassification {
    tier: PermissionTier
    isSystemBlocked?: boolean
    isSecretAccess?: boolean
    reason?: string
}

const SYSTEM_ROOT_PREFIXES = [
    '/etc',
    '/root',
    '/var',
    '/bin',
    '/usr',
    '/sbin',
    '/dev',
    '/proc',
    '/sys',
]

const CREDENTIAL_PATTERNS = [
    /\.ssh($|\/)/i,
    /~[/\\]\.ssh/i,
    /id_rsa/i,
    /id_ed25519/i,
    /id_dsa/i,
    /id_ecdsa/i,
    /\.pem$/i,
    /\.key$/i,
    /\.p12$/i,
    /\.pfx$/i,
]

const SECRET_PATTERNS = [
    /(^|\/)\.env(\.|$)/i,
    /\.secret($|\.)/i,
    /credentials\.json$/i,
    /secrets\.json$/i,
    /\.aws\/credentials/i,
]

const SAFE_TOOLS = new Set([
    'read_file',
    'view_file',
    'find_files',
    'grep_search',
    'list_dir',
    'ls',
    'search_web',
    'ask_question',
    'manage_task',
])

const DESTRUCTIVE_COMMAND_REGEXES = [
    /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*\b|--recursive)/i,
    /\brm\s+-[a-zA-Z]*f[a-zA-Z]*\s+/i,
    /\bgit\s+reset\s+--hard\b/i,
    /\bgit\s+push\s+.*(--force\b|-f\b)/i,
    /\bgit\s+clean\s+.*-[a-zA-Z]*f/i,
    /\bmkfs\b/i,
    /\bdd\s+if=/i,
    /\bdrop\s+table\b/i,
    /\bdrop\s+database\b/i,
    /\btruncate\s+table\b/i,
]

const SAFE_COMMAND_PREFIXES = [
    'git status',
    'git diff',
    'git log',
    'git show',
    'git branch',
    'ls',
    'dir',
    'grep',
    'pwd',
    'which',
    'where',
    'echo',
    'cat',
    'head',
    'tail',
    'find',
    'wc',
]

export function extractTargetPaths(toolCall: any): string[] {
    const paths: string[] = []
    if (!toolCall) return paths

    const input = toolCall.input || {}
    const candidateKeys = ['TargetFile', 'AbsolutePath', 'filePath', 'path', 'dirPath', 'file']
    for (const key of candidateKeys) {
        if (typeof input[key] === 'string' && input[key].trim()) {
            paths.push(input[key].trim())
        }
    }

    if (toolCall.name === 'run_command' || toolCall.name === 'bash') {
        const cmd = (input.CommandLine || input.command || '').toString()
        const tokens = cmd.split(/\s+/)
        for (const token of tokens) {
            if (
                token.startsWith('/') ||
                token.startsWith('~') ||
                token.includes('.env') ||
                token.includes('.ssh') ||
                token.endsWith('.pem') ||
                token.endsWith('.key')
            ) {
                paths.push(token)
            }
        }
    }

    return paths
}

export function checkPathGuard(targetPath: string): {
    isSystemBlocked: boolean
    isSecretAccess: boolean
} {
    const normalized = targetPath.replace(/\\/g, '/')

    // 1. Check system root prefixes
    for (const prefix of SYSTEM_ROOT_PREFIXES) {
        if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
            return { isSystemBlocked: true, isSecretAccess: false }
        }
    }

    // 2. Check private keys and certificates
    for (const pattern of CREDENTIAL_PATTERNS) {
        if (pattern.test(normalized)) {
            return { isSystemBlocked: true, isSecretAccess: false }
        }
    }

    // 3. Check workspace secrets
    for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(normalized)) {
            return { isSystemBlocked: false, isSecretAccess: true }
        }
    }

    return { isSystemBlocked: false, isSecretAccess: false }
}

export function isDestructiveCommand(cmd: string): boolean {
    const trimmed = cmd.trim()
    for (const regex of DESTRUCTIVE_COMMAND_REGEXES) {
        if (regex.test(trimmed)) {
            return true
        }
    }
    return false
}

export function isSafeCommand(cmd: string): boolean {
    const trimmed = cmd.trim()
    if (isDestructiveCommand(trimmed)) return false

    // If it contains destructive chaining or output redirection to existing files, not purely safe
    if (/[;&|]/.test(trimmed)) {
        const parts = trimmed
            .split(/[;&|]/)
            .map((p) => p.trim())
            .filter(Boolean)
        return parts.length > 0 && parts.every((part) => isSafeCommand(part))
    }

    for (const prefix of SAFE_COMMAND_PREFIXES) {
        if (trimmed === prefix || trimmed.startsWith(`${prefix} `)) {
            return true
        }
    }

    return false
}

export function classifyOperation(toolCall: any): OperationClassification {
    const name = toolCall?.name || ''
    const input = toolCall?.input || {}
    const targetPaths = extractTargetPaths(toolCall)

    // Check PathGuard on all target paths
    for (const p of targetPaths) {
        const pg = checkPathGuard(p)
        if (pg.isSystemBlocked) {
            return {
                tier: 'destructive',
                isSystemBlocked: true,
                reason: `PathGuard restricted system or credential path: ${p}`,
            }
        }
        if (pg.isSecretAccess) {
            return {
                tier: 'modifying',
                isSecretAccess: true,
                reason: `Access to workspace secret file: ${p}`,
            }
        }
    }

    // Shell command classification
    if (name === 'run_command' || name === 'bash') {
        const cmd = (input.CommandLine || input.command || '').toString().trim()
        if (isDestructiveCommand(cmd)) {
            return {
                tier: 'destructive',
                reason: `Destructive shell command: ${cmd}`,
            }
        }
        if (isSafeCommand(cmd)) {
            return {
                tier: 'safe',
                reason: `Read-only shell inspection command: ${cmd}`,
            }
        }
        return {
            tier: 'modifying',
            reason: `Modifying shell command: ${cmd}`,
        }
    }

    // Safe tools
    if (SAFE_TOOLS.has(name)) {
        return {
            tier: 'safe',
            reason: `Read-only tool: ${name}`,
        }
    }

    // Modifying file tools
    const modifyingTools = [
        'replace_file_content',
        'multi_replace_file_content',
        'write_to_file',
        'write',
        'edit_file',
        'edit_diff',
    ]
    if (modifyingTools.includes(name)) {
        return {
            tier: 'modifying',
            reason: `File modification tool: ${name}`,
        }
    }

    // MCP dynamic tools
    if (name.includes('__')) {
        return {
            tier: 'modifying',
            reason: `External MCP tool: ${name}`,
        }
    }

    return {
        tier: 'modifying',
        reason: `General tool: ${name}`,
    }
}

export class SessionWhitelistStore {
    private approvedPatterns: Set<string> = new Set()

    constructor(initialPatterns: string[] = []) {
        for (const p of initialPatterns) {
            this.add(p)
        }
    }

    public add(pattern: string): void {
        const trimmed = pattern.trim()
        // Destructive commands can NEVER be whitelisted
        if (isDestructiveCommand(trimmed)) {
            return
        }
        this.approvedPatterns.add(trimmed)
    }

    public isApproved(cmdOrTool: string): boolean {
        const target = cmdOrTool.trim()
        if (isDestructiveCommand(target)) {
            return false
        }

        for (const pattern of this.approvedPatterns) {
            if (pattern === target) return true

            // Wildcard prefix matching, e.g. "bun test*" matches "bun test" and "bun test packages/agent"
            if (pattern.endsWith('*')) {
                const prefix = pattern.slice(0, -1)
                if (target.startsWith(prefix)) return true
            }
        }

        return false
    }

    public getAll(): string[] {
        return Array.from(this.approvedPatterns)
    }

    public clear(): void {
        this.approvedPatterns.clear()
    }
}
