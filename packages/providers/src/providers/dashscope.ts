import { OpenAIProvider } from './openai.ts'

export class DashScopeProvider extends OpenAIProvider {
    public override id = 'dashscope'

    constructor(apiKey?: string) {
        super(
            'https://dashscope.aliyuncs.com/compatible-mode/v1',
            apiKey || process.env.DASHSCOPE_API_KEY
        )
    }
}
