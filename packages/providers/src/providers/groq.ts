import { OpenAIProvider } from './openai.ts'

export class GroqProvider extends OpenAIProvider {
    public override id = 'groq'

    constructor(apiKey?: string) {
        super('https://api.groq.com/openai/v1', apiKey || process.env.GROQ_API_KEY)
    }
}
