import { http, HttpResponse } from 'msw'

export const handlers = [
    // OpenAI Chat Completions Mock
    http.post('https://api.openai.com/v1/chat/completions', () => {
        return HttpResponse.json({
            id: 'chatcmpl-mock-id',
            object: 'chat.completion',
            created: Date.now(),
            model: 'gpt-4o',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: 'Mocked OpenAI response from MSW',
                    },
                    finish_reason: 'stop',
                },
            ],
            usage: {
                prompt_tokens: 10,
                completion_tokens: 8,
                total_tokens: 18,
            },
        })
    }),

    // Anthropic Messages Mock
    http.post('https://api.anthropic.com/v1/messages', () => {
        return HttpResponse.json({
            id: 'msg_mock_id',
            type: 'message',
            role: 'assistant',
            model: 'claude-3-7-sonnet-20250219',
            content: [
                {
                    type: 'text',
                    text: 'Mocked Anthropic response from MSW',
                },
            ],
            stop_reason: 'end_turn',
            usage: {
                input_tokens: 10,
                output_tokens: 8,
            },
        })
    }),

    // Google Gemini Generate Content Mock
    http.post('https://generativelanguage.googleapis.com/*', () => {
        return HttpResponse.json({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: 'Mocked Gemini response from MSW',
                            },
                        ],
                        role: 'model',
                    },
                    finishReason: 'STOP',
                },
            ],
        })
    }),
]
