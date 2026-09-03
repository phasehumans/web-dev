import { OpenAIProvider } from './openai.ts'

export class MiniMaxProvider extends OpenAIProvider {
    public override id = 'minimax'

    constructor(apiKey?: string) {
        super('https://api.minimax.chat/v1', apiKey || process.env.MINIMAX_API_KEY)
    }
}
