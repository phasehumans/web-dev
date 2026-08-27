import { OpenAIProvider } from './openai.ts'

export class CohereProvider extends OpenAIProvider {
    public override id = 'cohere'

    constructor(apiKey?: string) {
        super('https://api.cohere.com/v2', apiKey || process.env.COHERE_API_KEY)
    }
}
