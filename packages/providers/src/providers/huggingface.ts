import { OpenAIProvider } from './openai.ts'

export class HuggingFaceProvider extends OpenAIProvider {
    public override id = 'huggingface'

    constructor(apiKey?: string) {
        super(
            'https://router.huggingface.co/v1',
            apiKey || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY
        )
    }
}
