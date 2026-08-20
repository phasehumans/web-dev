import type {
    ContextDecomposition,
    DecomposeContextOptions,
    RequestLogRuleEntry,
    RequestLogSystemPromptDecomposition,
    RequestLogToolEntry,
} from '../types'

export function estimateTextTokens(text?: string | null): number {
    if (!text) return 0
    return Math.ceil(text.length / 4)
}

export function decomposeSystemPrompt(
    systemPrompt?: string | null
): RequestLogSystemPromptDecomposition {
    if (!systemPrompt || typeof systemPrompt !== 'string') {
        return {
            basePrompt: '',
            basePromptTokens: 0,
            rules: [],
            rulesText: '',
            rulesTokens: 0,
            skills: [],
            skillsText: '',
            skillsTokens: 0,
            dynamicEnv: '',
            dynamicEnvTokens: 0,
            totalTokens: 0,
        }
    }

    const trimmedPrompt = systemPrompt.trim()

    // 1. Extract rules from <project_context>...</project_context>
    const rules: RequestLogRuleEntry[] = []
    let rulesText = ''
    const projectContextRegex = /<project_context>([\s\S]*?)<\/project_context>/i
    const projectContextMatch = trimmedPrompt.match(projectContextRegex)

    if (projectContextMatch && projectContextMatch[1]) {
        rulesText = projectContextMatch[0].trim()
        const instructionRegex =
            /<project_instructions(?:\s+path="([^"]*)")?>\n?([\s\S]*?)\n?<\/project_instructions>/gi
        let match: RegExpExecArray | null
        while ((match = instructionRegex.exec(projectContextMatch[1])) !== null) {
            const rulePath = match[1] || ''
            const content = (match[2] || '').trim()
            rules.push({
                path: rulePath,
                content,
                tokens: estimateTextTokens(content),
            })
        }
    }

    // 2. Extract skills from Available Skills:\n...
    let skillsText = ''
    const skills: string[] = []
    const skillsRegex =
        /Available Skills:\n([\s\S]*?)(?=(?:\n\n<project_context>|\n\nCurrent date:|$))/i
    const skillsMatch = trimmedPrompt.match(skillsRegex)

    if (skillsMatch && skillsMatch[1]) {
        skillsText = skillsMatch[1].trim()
        const skillLines = skillsText
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        skills.push(...skillLines)
    }

    // 3. Extract dynamic environment: Current date: ...
    let dynamicEnv = ''
    const envRegex = /\n\nCurrent date:[\s\S]*$/i
    const envMatch = trimmedPrompt.match(envRegex)
    if (envMatch) {
        dynamicEnv = envMatch[0].trim()
    } else {
        const startEnvRegex = /^Current date:[\s\S]*$/i
        const startEnvMatch = trimmedPrompt.match(startEnvRegex)
        if (startEnvMatch) {
            dynamicEnv = startEnvMatch[0].trim()
        }
    }

    // 4. Extract base system prompt
    // Base prompt is whatever comes before Available Skills, <project_context>, or Current date:
    let basePrompt = trimmedPrompt
    const cutMarkers = [
        '\n\nAvailable Skills:',
        'Available Skills:',
        '\n\n<project_context>',
        '<project_context>',
        '\n\nCurrent date:',
        'Current date:',
    ]

    let earliestCutIndex = -1
    for (const marker of cutMarkers) {
        const idx = basePrompt.indexOf(marker)
        if (idx !== -1) {
            if (earliestCutIndex === -1 || idx < earliestCutIndex) {
                earliestCutIndex = idx
            }
        }
    }

    if (earliestCutIndex !== -1) {
        basePrompt = basePrompt.substring(0, earliestCutIndex).trim()
    } else {
        basePrompt = basePrompt.trim()
    }

    const basePromptTokens = estimateTextTokens(basePrompt)
    const rulesTokens = estimateTextTokens(rulesText)
    const skillsTokens = estimateTextTokens(skillsText)
    const dynamicEnvTokens = estimateTextTokens(dynamicEnv)
    const totalTokens = basePromptTokens + rulesTokens + skillsTokens + dynamicEnvTokens

    return {
        basePrompt,
        basePromptTokens,
        rules,
        rulesText,
        rulesTokens,
        skills,
        skillsText,
        skillsTokens,
        dynamicEnv,
        dynamicEnvTokens,
        totalTokens,
    }
}

export function decomposeTools(toolsInput?: any[] | Map<string, any> | null): {
    builtInTools: { tools: RequestLogToolEntry[]; tokens: number }
    dynamicMcpTools: { tools: RequestLogToolEntry[]; tokens: number }
    allTools: RequestLogToolEntry[]
    totalTokens: number
} {
    const rawTools: any[] = []
    if (toolsInput) {
        if (Array.isArray(toolsInput)) {
            rawTools.push(...toolsInput)
        } else if (typeof (toolsInput as any).values === 'function') {
            rawTools.push(...Array.from((toolsInput as any).values()))
        }
    }

    const allTools: RequestLogToolEntry[] = []
    const builtInToolsList: RequestLogToolEntry[] = []
    const dynamicMcpToolsList: RequestLogToolEntry[] = []

    for (const t of rawTools) {
        if (!t || typeof t !== 'object') continue
        const name = String(t.name || '')
        const description = t.description ? String(t.description).replace(/\s+/g, ' ').trim() : ''
        const inputSchema = t.inputSchema || {}
        const isMcp = Boolean(name.includes('__') || t.isMcp || t.serverName)
        const serverName = name.includes('__') ? name.split('__')[0] : t.serverName || undefined

        const schemaPayload = JSON.stringify({ name, description, inputSchema })
        const tokens = estimateTextTokens(schemaPayload)

        const entry: RequestLogToolEntry = {
            name,
            description,
            inputSchema,
            tokens,
            isMcp,
            serverName,
        }

        allTools.push(entry)
        if (isMcp) {
            dynamicMcpToolsList.push(entry)
        } else {
            builtInToolsList.push(entry)
        }
    }

    const builtInTokens = builtInToolsList.reduce((acc, cur) => acc + cur.tokens, 0)
    const dynamicMcpTokens = dynamicMcpToolsList.reduce((acc, cur) => acc + cur.tokens, 0)

    return {
        builtInTools: {
            tools: builtInToolsList,
            tokens: builtInTokens,
        },
        dynamicMcpTools: {
            tools: dynamicMcpToolsList,
            tokens: dynamicMcpTokens,
        },
        allTools,
        totalTokens: builtInTokens + dynamicMcpTokens,
    }
}

export function decomposeMessages(messagesInput?: any[] | null): {
    userTokens: number
    assistantTokens: number
    toolTokens: number
    totalTokens: number
} {
    if (!messagesInput || !Array.isArray(messagesInput)) {
        return {
            userTokens: 0,
            assistantTokens: 0,
            toolTokens: 0,
            totalTokens: 0,
        }
    }

    let userTokens = 0
    let assistantTokens = 0
    let toolTokens = 0

    for (const msg of messagesInput) {
        if (!msg || typeof msg !== 'object' || msg.isUI) continue
        if (msg.role === 'system') continue // System prompt is accounted for separately

        const contentStr =
            typeof msg.content === 'string'
                ? msg.content
                : msg.content
                  ? JSON.stringify(msg.content)
                  : ''
        const contentTokens = estimateTextTokens(contentStr)

        if (msg.role === 'user') {
            userTokens += contentTokens
        } else if (msg.role === 'assistant') {
            assistantTokens += contentTokens
            if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
                toolTokens += estimateTextTokens(JSON.stringify(msg.toolCalls))
            }
        } else if (msg.role === 'tool') {
            toolTokens += contentTokens
        }
    }

    return {
        userTokens,
        assistantTokens,
        toolTokens,
        totalTokens: userTokens + assistantTokens + toolTokens,
    }
}

export function decomposeContext(options: DecomposeContextOptions): ContextDecomposition {
    const { agent, model: modelOpt, maxTokens: maxTokensOpt } = options
    const model = modelOpt || agent?.modelOptions?.model || 'gemini-3.6-flash'
    const maxTokens = maxTokensOpt || 1000000

    const rawSystemPrompt = options.systemPrompt ?? agent?.systemPrompt ?? ''
    const rawTools = options.tools ?? agent?.tools ?? []
    const rawMessages = options.messages ?? agent?.messages ?? []

    const sysDecomp = decomposeSystemPrompt(rawSystemPrompt)
    const toolsDecomp = decomposeTools(rawTools)
    const msgsDecomp = decomposeMessages(rawMessages)

    const totalTokens = sysDecomp.totalTokens + toolsDecomp.totalTokens + msgsDecomp.totalTokens
    const freeTokens = Math.max(0, maxTokens - totalTokens)
    const cacheableStaticPrefixTokens =
        sysDecomp.basePromptTokens +
        sysDecomp.rulesTokens +
        sysDecomp.skillsTokens +
        toolsDecomp.totalTokens

    return {
        model,
        maxTokens,
        basePrompt: {
            text: sysDecomp.basePrompt,
            tokens: sysDecomp.basePromptTokens,
        },
        rules: {
            files: sysDecomp.rules,
            text: sysDecomp.rulesText,
            tokens: sysDecomp.rulesTokens,
        },
        skills: {
            items: sysDecomp.skills,
            text: sysDecomp.skillsText,
            tokens: sysDecomp.skillsTokens,
        },
        dynamicEnv: {
            text: sysDecomp.dynamicEnv,
            tokens: sysDecomp.dynamicEnvTokens,
        },
        builtInTools: toolsDecomp.builtInTools,
        dynamicMcpTools: toolsDecomp.dynamicMcpTools,
        conversationHistory: msgsDecomp,
        totalTokens,
        freeTokens,
        cacheableStaticPrefixTokens,
    }
}
