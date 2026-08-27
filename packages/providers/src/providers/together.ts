import { OpenAIProvider } from './openai.ts'

export class TogetherProvider extends OpenAIProvider {
    public override id = 'together'

    constructor(apiKey?: string) {
        super('https://api.together.xyz/v1', apiKey || process.env.TOGETHER_API_KEY)
    }
}
