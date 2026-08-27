import { OpenAIProvider } from './openai.ts'

export class PerplexityProvider extends OpenAIProvider {
    public override id = 'perplexity'

    constructor(apiKey?: string) {
        super('https://api.perplexity.ai', apiKey || process.env.PERPLEXITY_API_KEY)
    }
}
