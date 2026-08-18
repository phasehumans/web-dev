import { OpenAIProvider } from './openai.ts'

export class XAIProvider extends OpenAIProvider {
    public override id = 'xai'

    constructor(apiKey?: string) {
        super('https://api.x.ai/v1', apiKey || process.env.XAI_API_KEY)
    }
}
