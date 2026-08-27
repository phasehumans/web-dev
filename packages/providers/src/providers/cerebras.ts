import { OpenAIProvider } from './openai.ts'

export class CerebrasProvider extends OpenAIProvider {
    public override id = 'cerebras'

    constructor(apiKey?: string) {
        super('https://api.cerebras.ai/v1', apiKey || process.env.CEREBRAS_API_KEY)
    }
}
