import { OpenAIProvider } from './openai.ts'

export class SambaNovaProvider extends OpenAIProvider {
    public override id = 'sambanova'

    constructor(apiKey?: string) {
        super('https://api.sambanova.ai/v1', apiKey || process.env.SAMBANOVA_API_KEY)
    }
}
