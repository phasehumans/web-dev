import { AnthropicProvider } from './anthropic.ts'

export class KimiProvider extends AnthropicProvider {
    public override id = 'kimi'

    constructor(apiKey?: string) {
        super('https://api.kimi.com/coding', apiKey || process.env.KIMI_API_KEY)
    }
}
