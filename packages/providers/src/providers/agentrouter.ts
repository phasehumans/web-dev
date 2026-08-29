import { OpenAIProvider } from './openai.ts'

export const AGENTROUTER_DEFAULT_HEADERS = {
    'User-Agent': 'claude-cli/2.1.0 (external, sdk-cli)',
}

export class AgentRouterProvider extends OpenAIProvider {
    public override id = 'agentrouter'

    constructor(apiKey?: string, defaultHeaders?: Record<string, string>) {
        super(
            'https://agentrouter.org/v1',
            apiKey || process.env.AGENTROUTER_API_KEY,
            defaultHeaders || AGENTROUTER_DEFAULT_HEADERS
        )
    }
}
