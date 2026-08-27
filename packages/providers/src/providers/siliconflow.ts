import { OpenAIProvider } from './openai.ts'

export class SiliconFlowProvider extends OpenAIProvider {
    public override id = 'siliconflow'

    constructor(apiKey?: string) {
        super('https://api.siliconflow.cn/v1', apiKey || process.env.SILICONFLOW_API_KEY)
    }
}
