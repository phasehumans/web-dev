import { OpenAIProvider } from './openai.ts'

export class DeepSeekProvider extends OpenAIProvider {
    public override id = 'deepseek'

    constructor(apiKey?: string) {
        super('https://api.deepseek.com', apiKey || process.env.DEEPSEEK_API_KEY)
    }
}
