import { OpenAIProvider } from './openai.ts'

export class NvidiaProvider extends OpenAIProvider {
    public override id = 'nvidia'

    constructor(apiKey?: string) {
        super('https://integrate.api.nvidia.com/v1', apiKey || process.env.NVIDIA_API_KEY)
    }
}
