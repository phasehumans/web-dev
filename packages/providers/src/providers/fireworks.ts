import { OpenAIProvider } from './openai.ts'

export class FireworksProvider extends OpenAIProvider {
    public override id = 'fireworks'

    constructor(apiKey?: string) {
        super('https://api.fireworks.ai/inference/v1', apiKey || process.env.FIREWORKS_API_KEY)
    }
}
