export const MESSAGES = {
    AUTH: {
        LOGIN_SUCCESS_DECEMBER: 'Successfully logged in via December!',
        LOGIN_SUCCESS_DEVICE: 'Successfully logged in via device code!',
        API_KEY_SAVED: (provider: string) =>
            `Successfully validated and saved API key for ${provider}!`,
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
