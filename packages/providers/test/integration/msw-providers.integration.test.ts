import { describe, expect, test, beforeAll, afterAll, afterEach } from 'bun:test'

import { server } from '../helpers/msw-server'

describe('MSW Provider HTTP Interception (Integration)', () => {
    beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())

    test('intercepts OpenAI POST /v1/chat/completions', async () => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gpt-4o', messages: [] }),
        })
        const data = await response.json()
        expect(response.status).toBe(200)
        expect(data.choices[0].message.content).toBe('Mocked OpenAI response from MSW')
    })

    test('intercepts Anthropic POST /v1/messages', async () => {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'claude-3-7-sonnet-20250219', messages: [] }),
        })
        const data = await response.json()
        expect(response.status).toBe(200)
        expect(data.content[0].text).toBe('Mocked Anthropic response from MSW')
    })

    test('intercepts Google Gemini generateContent endpoint', async () => {
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1/models/gemini:generateContent',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [] }),
            }
        )
        const data = await response.json()
        expect(response.status).toBe(200)
        expect(data.candidates[0].content.parts[0].text).toBe('Mocked Gemini response from MSW')
    })
})
