import { ConversationManager } from './conversation-manager'
import { NoopTracer } from './telemetry/noop-tracer'
import { evaporateStaleToolOutputs } from './utils/evaporation'

import type { SessionRepository } from './harness/session-repository'
import type { PlatformAdapter } from './platform-adapter'
import type { AgentTracer } from './telemetry/tracer.types'
import type { LLMProvider } from '@december/providers'
import type { AgentMessage, Message, Tool, AgentHooks } from '@december/shared'

export interface AgentConfig {
    sessionId?: string
    systemPrompt?: string
    tools: Tool[]
    llm: LLMProvider
    operations: PlatformAdapter
    modelOptions?: Record<string, any>
    sessionRepository?: SessionRepository
    hooks?: AgentHooks
    convertToLlm?: (messages: AgentMessage[]) => Message[]
    thinkingLevel?: 'auto' | 'off' | 'minimal' | 'low' | 'medium' | 'high'
    steeringMode?: 'all' | 'one-at-a-time'
    followUpMode?: 'all' | 'one-at-a-time'
    workspaceDir?: string
    disableLogging?: boolean
    tracer?: AgentTracer
}

class PendingMessageQueue {
    private queue: AgentMessage[] = []
    public mode: 'all' | 'one-at-a-time'

    constructor(mode: 'all' | 'one-at-a-time') {
        this.mode = mode
    }

    push(msg: AgentMessage) {
        this.queue.push(msg)
    }

    get length() {
        return this.queue.length
    }

    drain(): AgentMessage[] {
        if (this.mode === 'all') {
            const drained = this.queue.slice()
            this.queue = []
            return drained
        }
        if (this.queue.length > 0) {
            return [this.queue.shift()!]
        }
        return []
    }
}

export class Agent {
    public conversation: ConversationManager
    public tools: Map<string, Tool> = new Map()
    public systemPrompt: string
    public llm: LLMProvider
    public sessionId: string
    public sessionRepository?: SessionRepository
    public hooks?: AgentHooks
    public operations: PlatformAdapter
    public env: Map<string, string>
    public modelOptions?: Record<string, any>
    public thinkingLevel?: 'auto' | 'off' | 'minimal' | 'low' | 'medium' | 'high'
    public steeringQueue: PendingMessageQueue
    public followUpQueue: PendingMessageQueue
    public activeAbortController?: AbortController
    public convertToLlm: (messages: AgentMessage[]) => Message[]
    public mcpPool?: any
    public workspaceDir?: string
    public disableLogging: boolean
    public tracer: AgentTracer

    constructor(config: AgentConfig) {
        this.llm = config.llm
        this.systemPrompt = config.systemPrompt || 'You are a helpful coding agent.'
        this.sessionId = config.sessionId || 'default'
        this.sessionRepository = config.sessionRepository
        this.hooks = config.hooks
        this.operations = config.operations
        this.env = new Map<string, string>()
        this.modelOptions = config.modelOptions
        this.thinkingLevel = config.thinkingLevel || 'auto'
        this.convertToLlm = config.convertToLlm || this.defaultConvertToLlm
        this.steeringQueue = new PendingMessageQueue(config.steeringMode || 'all')
        this.followUpQueue = new PendingMessageQueue(config.followUpMode || 'all')
        this.conversation = new ConversationManager()
        this.workspaceDir = config.workspaceDir
        this.disableLogging = config.disableLogging || false
        this.tracer = config.tracer || new NoopTracer()

        for (const tool of config.tools) {
            this.tools.set(tool.name, tool)
        }

        this.conversation.addMessage({
            role: 'system',
            content: this.systemPrompt,
        })
    }

    get messages(): AgentMessage[] {
        return this.conversation.messages
    }

    set messages(msgs: AgentMessage[]) {
        this.conversation.messages = msgs
    }

    private defaultConvertToLlm(messages: AgentMessage[]): Message[] {
        const filtered = messages.filter((m) => !m.isUI)
        return evaporateStaleToolOutputs(filtered, 3)
    }

    public steer(message: AgentMessage) {
        this.steeringQueue.push(message)
    }

    public followUp(message: AgentMessage) {
        this.followUpQueue.push(message)
    }

    public registerTool(tool: Tool): void {
        this.tools.set(tool.name, tool)
    }

    public unregisterTool(toolName: string): void {
        this.tools.delete(toolName)
    }

    public syncMcpTools(newMcpTools: Tool[]): void {
        for (const toolName of Array.from(this.tools.keys())) {
            if (toolName.includes('__')) {
                this.tools.delete(toolName)
            }
        }
        for (const tool of newMcpTools) {
            this.tools.set(tool.name, tool)
        }
    }

    public abort() {
        if (this.activeAbortController) {
            this.activeAbortController.abort()
        }
    }

    public setLLM(llm: LLMProvider) {
        this.llm = llm
    }

    public addMessage(message: AgentMessage) {
        this.conversation.addMessage(message)
    }

    public async saveContext() {
        if (this.sessionRepository) {
            await this.sessionRepository.saveContext(this.sessionId, this.messages)
        }
    }

    public async loadContext(sessionId?: string) {
        if (sessionId) this.sessionId = sessionId
        if (this.sessionRepository) {
            const loaded = await this.sessionRepository.loadContext(this.sessionId)
            if (loaded.length > 0) {
                this.messages = loaded
            }
        }
    }

    public async clearContext() {
        if (this.messages.length > 0) {
            this.messages = [this.messages[0]!]
            await this.saveContext()
        }
    }

    public async newContext() {
        this.sessionId = `session-${Date.now()}`
        if (this.messages.length > 0) {
            this.messages = [this.messages[0]!]
        }
        await this.saveContext()
    }

    public async forkContext(newSessionId?: string) {
        this.sessionId = newSessionId || `session-${Date.now()}`
        await this.saveContext()
        return this.sessionId
    }
}
