import { OpenAIProvider } from './openai.ts'

export class HyperbolicProvider extends OpenAIProvider {
    public override id = 'hyperbolic'

    constructor(apiKey?: string) {
        super('https://api.hyperbolic.xyz/v1', apiKey || process.env.HYPERBOLIC_API_KEY)
    }
}
