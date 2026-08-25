import type { McpCatalogPreset, McpServerConfig } from './types'

export const MCP_CATALOG: McpCatalogPreset[] = [
    {
        id: 'github',
        name: 'GitHub',
        category: 'Development',
        description: 'Search repositories, manage issues, read pull requests and inspect commits',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
            env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
            autoApprove: ['get_issue', 'list_issues', 'search_repositories', 'get_file_contents'],
            catalogId: 'github',
        },
        envPrompts: [
            {
                key: 'GITHUB_TOKEN',
                label: 'GitHub Personal Access Token',
                placeholder: 'ghp_...',
                secret: true,
                required: true,
            },
        ],
    },
    {
        id: 'postgres',
        name: 'PostgreSQL',
        category: 'Database',
        description: 'Execute read-only SQL queries, inspect table schemas, and explore databases',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-postgres', '${POSTGRES_URL}'],
            autoApprove: ['describe_table', 'list_tables'],
            catalogId: 'postgres',
        },
        envPrompts: [
            {
                key: 'POSTGRES_URL',
                label: 'Postgres Connection URI',
                placeholder: 'postgresql://user:pass@localhost:5432/db',
                secret: true,
                required: true,
            },
        ],
    },
    {
        id: 'sqlite',
        name: 'SQLite',
        category: 'Database',
        description: 'Query, describe, and explore local SQLite database files',
        config: {
            command: 'uvx',
            args: ['mcp-server-sqlite', '--db-path', '${DB_PATH:-./dev.db}'],
            autoApprove: ['read_query', 'describe_table', 'list_tables'],
            catalogId: 'sqlite',
        },
        envPrompts: [
            {
                key: 'DB_PATH',
                label: 'Path to SQLite database file',
                defaultValue: './dev.db',
                placeholder: './dev.db',
                secret: false,
                required: true,
            },
        ],
    },
    {
        id: 'brave-search',
        name: 'Brave Search',
        category: 'Search & Web',
        description: 'High-quality web search and local point-of-interest discovery',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-brave-search'],
            env: { BRAVE_API_KEY: '${BRAVE_API_KEY}' },
            autoApprove: ['brave_web_search', 'brave_local_search'],
            catalogId: 'brave-search',
        },
        envPrompts: [
            {
                key: 'BRAVE_API_KEY',
                label: 'Brave Search API Key',
                placeholder: 'BSA...',
                secret: true,
                required: true,
            },
        ],
    },
    {
        id: 'fetch',
        name: 'Fetch (Web Content)',
        category: 'Search & Web',
        description: 'Fetch web pages and convert HTML to clean markdown for LLM consumption',
        config: {
            command: 'uvx',
            args: ['mcp-server-fetch'],
            autoApprove: ['fetch'],
            catalogId: 'fetch',
        },
    },
    {
        id: 'puppeteer',
        name: 'Puppeteer Browser',
        category: 'Search & Web',
        description: 'Browser automation, screenshot rendering, and JavaScript console execution',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-puppeteer'],
            catalogId: 'puppeteer',
        },
    },
    {
        id: 'memory',
        name: 'Knowledge Graph Memory',
        category: 'Productivity',
        description: 'Persistent knowledge graph memory and entity relations across chat sessions',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            autoApprove: ['read_graph', 'search_nodes', 'open_nodes'],
            catalogId: 'memory',
        },
    },
    {
        id: 'filesystem',
        name: 'Secure Filesystem Access',
        category: 'System',
        description:
            'Read and search specific allowed filesystem directories outside workspace root',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '${ALLOWED_DIR:-.}'],
            autoApprove: ['list_directory', 'read_file'],
            catalogId: 'filesystem',
        },
        envPrompts: [
            {
                key: 'ALLOWED_DIR',
                label: 'Allowed Root Directory Path',
                defaultValue: '.',
                placeholder: '.',
                secret: false,
                required: true,
            },
        ],
    },
    {
        id: 'sentry',
        name: 'Sentry',
        category: 'Development',
        description: 'Query Sentry issues, stack traces, and application crash diagnostics',
        config: {
            command: 'uvx',
            args: ['mcp-server-sentry', '--auth-token', '${SENTRY_AUTH_TOKEN}'],
            autoApprove: ['get_issue', 'list_issues'],
            catalogId: 'sentry',
        },
        envPrompts: [
            {
                key: 'SENTRY_AUTH_TOKEN',
                label: 'Sentry Auth Token',
                placeholder: 'sntrys_...',
                secret: true,
                required: true,
            },
        ],
    },
    {
        id: 'linear',
        name: 'Linear',
        category: 'Productivity',
        description: 'Search, create, and update issues and project roadmaps in Linear',
        config: {
            command: 'npx',
            args: ['-y', '@linear/mcp-server'],
            env: { LINEAR_API_KEY: '${LINEAR_API_KEY}' },
            autoApprove: ['get_issue', 'list_issues', 'search_issues'],
            catalogId: 'linear',
        },
        envPrompts: [
            {
                key: 'LINEAR_API_KEY',
                label: 'Linear Personal API Key',
                placeholder: 'lin_api_...',
                secret: true,
                required: true,
            },
        ],
    },
]

export function getCatalogPreset(id: string): McpCatalogPreset | undefined {
    return MCP_CATALOG.find((p) => p.id === id)
}

export function getCatalogCategories(): string[] {
    const categories = new Set<string>()
    for (const preset of MCP_CATALOG) {
        categories.add(preset.category)
    }
    return Array.from(categories)
}

export function instantiateCatalogPreset(
    preset: McpCatalogPreset,
    envValues: Record<string, string> = {}
): McpServerConfig {
    const serverConfig: McpServerConfig = {
        ...preset.config,
        description: preset.description,
        catalogId: preset.id,
    }

    if (preset.config.args) {
        serverConfig.args = preset.config.args.map((arg) => {
            let replaced = arg
            for (const [key, val] of Object.entries(envValues)) {
                replaced = replaced.replace(new RegExp(`\\$\\{${key}(:-[^}]*)?\\}`, 'g'), val)
            }
            return replaced
        })
    }

    if (preset.config.env) {
        const env: Record<string, string> = {}
        for (const [k, v] of Object.entries(preset.config.env)) {
            let val = v
            for (const [envKey, envVal] of Object.entries(envValues)) {
                val = val.replace(new RegExp(`\\$\\{${envKey}(:-[^}]*)?\\}`, 'g'), envVal)
            }
            env[k] = val
        }
        serverConfig.env = env
    }

    return serverConfig
}
