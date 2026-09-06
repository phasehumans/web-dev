import { OpenAIProvider } from './openai.ts'

export class ArceeProvider extends OpenAIProvider {
    public override id = 'arcee'

    constructor(apiKey?: string) {
        super('https://api.arcee.ai/api/v1', apiKey || process.env.ARCEE_API_KEY)
    }
}
