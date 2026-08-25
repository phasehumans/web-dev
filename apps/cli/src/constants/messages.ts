export const AUTH_REQUIRED_NOTICE =
    'You are not logged in and have no custom API keys (BYOK) configured.\n\nPlease run `/login` to:\n- Sign in with your December account (Cloud Wallet), or\n- Configure Bring Your Own Key (BYOK) for providers like OpenAI, Anthropic, Gemini, OpenRouter, etc.'

export const HANDOFF_LOGIN_REQUIRED_NOTICE =
    'Cloud handoff migrates your local terminal session and workspace to December Cloud (https://trydecember.com).\n\nTo proceed, please log in:\n- Type `/login` and select Sign in with December (Device Code), or\n- Run `december login` in your terminal'

export const HANDOFF_INSUFFICIENT_CREDITS_NOTICE =
    'Insufficient credits in December Wallet ($0.00). Cloud handoff requires active credits to spin up remote cloud sandbox sessions on December Cloud.\n\nPlease add credits at https://trydecember.com/settings/billing to continue, then re-run `/handoff`.'

export const HANDOFF_SUCCESS_NOTICE = (sessionId: string) =>
    `Workspace handed off successfully!\n\nYour workspace files and chat history have been synced to December Cloud:\nhttps://trydecember.com/s/${sessionId}\n\nExiting local terminal in 3 seconds...`

export const MESSAGES = {
    AUTH: {
        LOGIN_SUCCESS_DECEMBER: 'Successfully logged in via December!',
        LOGIN_SUCCESS_DEVICE: 'Successfully logged in via device code!',
        API_KEY_SAVED: (provider: string) =>
            `Successfully validated and saved API key for ${provider}!`,
        REQUIRED_NOTICE: AUTH_REQUIRED_NOTICE,
    },
    TASKS: {
        KILLED: (id: string) => `Task ${id} killed.`,
    },
    CONFIG: {
        MODEL_UPDATED: (model: string) => `Default model updated to ${model}`,
        MAX_TOKENS_SET: (tokens: string) => `Max tokens set to ${tokens}`,
    },
    ERROR: {
        RATE_LIMIT:
            'Rate limit or quota exhausted from LLM provider. Please upgrade your API key tier with your provider (OpenAI, Anthropic, Gemini) or switch to December Cloud Subscription at https://trydecember.com/pricing\n\n',
    },
}
