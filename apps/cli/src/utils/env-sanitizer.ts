import fs from 'node:fs'
import path from 'node:path'

/**
 * List of known LLM / AI provider API keys and credential variables
 * that must never be loaded from project-level .env files into December CLI.
 */
export const SENSITIVE_LLM_ENV_KEYS: readonly string[] = [
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'OPENROUTER_API_KEY',
    'GROQ_API_KEY',
    'DEEPSEEK_API_KEY',
    'MISTRAL_API_KEY',
    'TOGETHER_API_KEY',
    'KIMI_API_KEY',
    'MOONSHOT_API_KEY',
    'CEREBRAS_API_KEY',
    'COHERE_API_KEY',
    'DASHSCOPE_API_KEY',
    'FIREWORKS_API_KEY',
    'HF_TOKEN',
    'HUGGINGFACE_API_KEY',
    'HYPERBOLIC_API_KEY',
    'MINIMAX_API_KEY',
    'NVIDIA_API_KEY',
    'PERPLEXITY_API_KEY',
    'SAMBANOVA_API_KEY',
    'SILICONFLOW_API_KEY',
    'XAI_API_KEY',
    'ZAI_API_KEY',
    'AGENTROUTER_API_KEY',
    'COPILOT_TOKEN',
    'GITHUB_COPILOT_TOKEN',
    'GITHUB_TOKEN',
    'GH_TOKEN',
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_AUTH_TOKEN',
    'OPENAI_OAUTH_TOKEN',
    'CODEX_TOKEN',
    'OPENAI_CODEX_TOKEN',
    'GEMINI_OAUTH_TOKEN',
    'ANTIGRAVITY_TOKEN',
    'GOOGLE_OAUTH_TOKEN',
    'DECEMBER_TOKEN',
]

/**
 * Detects if a variable name corresponds to an API key or auth token.
 */
export function isSensitiveEnvKey(key: string): boolean {
    const upper = key.toUpperCase()
    if (SENSITIVE_LLM_ENV_KEYS.includes(upper)) {
        return true
    }
    return (
        upper.endsWith('_API_KEY') ||
        upper.endsWith('_APIKEY') ||
        upper.endsWith('_AUTH_TOKEN') ||
        upper.endsWith('_OAUTH_TOKEN')
    )
}

/**
 * Parses key names from a .env file content without evaluating values.
 */
export function parseEnvKeyNames(content: string): string[] {
    const keys: string[] = []
    const lines = content.split('\n')
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        // Strip optional leading 'export '
        const clean = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
        const match = clean.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/)
        if (match && match[1]) {
            keys.push(match[1])
        }
    }
    return keys
}

/**
 * Locates project-level .env files starting from startDir up to the git root or root directory.
 */
export function findProjectEnvFiles(startDir: string = process.cwd()): string[] {
    const envFiles: string[] = []
    const envFileNames = [
        '.env',
        '.env.local',
        '.env.development',
        '.env.development.local',
        '.env.test',
        '.env.test.local',
        '.env.production',
        '.env.production.local',
        '.env.staging',
    ]

    let currentDir = path.resolve(startDir)
    const homeDir = path.resolve(process.env.HOME || '')

    while (true) {
        // Check standard .env files in currentDir
        for (const name of envFileNames) {
            const filePath = path.join(currentDir, name)
            try {
                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                    envFiles.push(filePath)
                }
            } catch {
                // Intentionally swallowed: permission or access error
            }
        }

        // Check inside .december folder
        for (const name of envFileNames) {
            const filePath = path.join(currentDir, '.december', name)
            try {
                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                    envFiles.push(filePath)
                }
            } catch {
                // Intentionally swallowed: permission or access error
            }
        }

        // Stop traversal if we reached the git root
        const gitDir = path.join(currentDir, '.git')
        if (fs.existsSync(gitDir)) {
            break
        }

        // Stop traversal if we reached home directory or root directory
        const parentDir = path.dirname(currentDir)
        if (parentDir === currentDir || (homeDir && currentDir === homeDir)) {
            break
        }

        currentDir = parentDir
    }

    return envFiles
}

/**
 * Purges sensitive API keys and tokens found in project-level .env files from process.env.
 * Ensures the CLI never loads credentials from a project root or workspace .env.
 */
export function purgeProjectEnvApiKeys(startDir: string = process.cwd()): string[] {
    const envFiles = findProjectEnvFiles(startDir)
    const purged: string[] = []

    for (const filePath of envFiles) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8')
            const keys = parseEnvKeyNames(content)
            for (const key of keys) {
                if (isSensitiveEnvKey(key)) {
                    if (process.env[key] !== undefined) {
                        delete process.env[key]
                        purged.push(key)
                    }
                }
            }
        } catch {
            // Intentionally swallowed: unreadable file handled gracefully
        }
    }

    return purged
}
