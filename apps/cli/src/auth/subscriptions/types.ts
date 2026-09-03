export interface SubscriptionTokenBundle {
    provider: 'claude' | 'codex' | 'copilot' | 'gemini' | 'antigravity' | string
    accessToken: string
    refreshToken?: string
    expiresAt?: number // timestamp in ms
    subscriptionType?: string // e.g. 'claude_pro', 'claude_max', 'chatgpt_plus', 'copilot', 'gemini_advanced'
    email?: string
    accountName?: string
    tokenType?: string
    endpoint?: string
    source?: 'local_import' | 'oauth_login' | 'env'
    updatedAt?: number
    extra?: Record<string, any>
}

export interface SubscriptionAdapter {
    provider: string
    displayName: string
    detectLocal(): Promise<SubscriptionTokenBundle | null>
    refreshToken?(bundle: SubscriptionTokenBundle): Promise<SubscriptionTokenBundle>
    loginOAuth?(onCode?: (code: string, uri: string) => void): Promise<SubscriptionTokenBundle>
    verifyToken?(bundle: SubscriptionTokenBundle): Promise<boolean>
}
