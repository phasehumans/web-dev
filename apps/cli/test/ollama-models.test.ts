import { describe, expect, it } from 'bun:test'

import {
    getProviderModels,
    isToolCompatibleOllamaModel,
    fetchOllamaModels,
    checkOllamaStatus,
    isValidModelForProvider,
    getDefaultModelForProvider,
} from '../src/utils/models'

describe('Ollama Models & Discovery (Unit)', () => {
    it('returns curated default models for ollama in getProviderModels', () => {
        const models = getProviderModels('ollama')
        expect(models.length).toBeGreaterThan(0)
        expect(models.some((m) => m.value === 'qwen2.5-coder:7b')).toBe(true)
        expect(models.some((m) => m.value === 'llama3.3:70b')).toBe(true)
    })

    it('correctly validates tool-compatible model families', () => {
        expect(isToolCompatibleOllamaModel('qwen2.5-coder:7b')).toBe(true)
        expect(isToolCompatibleOllamaModel('qwen2.5-coder:32b-instruct-q8_0')).toBe(true)
        expect(isToolCompatibleOllamaModel('llama3.3:70b')).toBe(true)
        expect(isToolCompatibleOllamaModel('llama3.1:8b')).toBe(true)
        expect(isToolCompatibleOllamaModel('mistral-nemo:latest')).toBe(true)

        // Non-tool models or pure reasoning models should be filtered out under strict whitelist
        expect(isToolCompatibleOllamaModel('deepseek-r1:7b')).toBe(false)
        expect(isToolCompatibleOllamaModel('phi3:mini')).toBe(false)
        expect(isToolCompatibleOllamaModel('gemma:2b')).toBe(false)
    })

    it('fetches and filters installed models from Ollama /api/tags endpoint', async () => {
        const mockFetch = async () => {
            return new Response(
                JSON.stringify({
                    models: [
                        { name: 'qwen2.5-coder:7b', size: 4683073994 },
                        { name: 'deepseek-r1:7b', size: 4683073994 }, // not tool compatible
                        { name: 'llama3.3:latest', size: 42000000000 },
                    ],
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const models = await fetchOllamaModels('http://localhost:11434', mockFetch as any)
        expect(models.length).toBe(2)
        expect(models[0].value).toBe('qwen2.5-coder:7b')
        expect(models[1].value).toBe('llama3.3:latest')
    })

    it('returns health check status correctly when server is reachable', async () => {
        const mockFetch = async () => {
            return new Response(
                JSON.stringify({
                    models: [
                        { name: 'qwen2.5-coder:7b', size: 4683073994 },
                        { name: 'phi3:mini', size: 2000000000 },
                    ],
                }),
                { status: 200 }
            )
        }

        const status = await checkOllamaStatus('http://localhost:11434', mockFetch as any)
        expect(status.running).toBe(true)
        expect(status.models).toEqual(['qwen2.5-coder:7b', 'phi3:mini'])
        expect(status.compatibleModels).toEqual(['qwen2.5-coder:7b'])
    })

    it('returns health check status with error when server is unreachable', async () => {
        const mockFetch = async () => {
            throw new Error('ECONNREFUSED')
        }

        const status = await checkOllamaStatus('http://localhost:11434', mockFetch as any)
        expect(status.running).toBe(false)
        expect(status.compatibleModels.length).toBe(0)
        expect(status.error).toContain('ECONNREFUSED')
    })

    it('validates and gets default model for ollama', () => {
        expect(isValidModelForProvider('ollama', 'qwen2.5-coder:7b')).toBe(true)
        expect(isValidModelForProvider('ollama', 'llama3.3:70b')).toBe(true)
        expect(isValidModelForProvider('ollama', 'incompatible-model:latest')).toBe(false)
        expect(isValidModelForProvider('ollama', '')).toBe(false)
        expect(getDefaultModelForProvider('ollama')).toBe('qwen2.5-coder:7b')
    })
})
