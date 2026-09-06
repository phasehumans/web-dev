export type Message = {
    id: number | string
    role: 'user' | 'assistant' | 'error' | 'header'
    text?: string
    displayText?: string
    blocks?: any[]
    usage?: { promptTokens: number; completionTokens: number }
}

export type AuthMode =
    | 'none'
    | 'menu'
    | 'subscription_select'
    | 'subscription_provider'
    | 'context_select'
    | 'byok_provider'
    | 'byok_key'
    | 'model_select'
    | 'logout_select'
    | 'session_select'
    | 'plan_approve'
    | 'grill_question'
    | 'ask_question'
    | 'tool_permission'
    | 'settings_main'
    | 'tasks_mode'
    | 'usage'
    | 'ollama_setup'
    | 'mcp_manager'
