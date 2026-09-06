import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { getModelContextWindow } from '@december/providers'

import { FALLBACK_OPENROUTER_MODELS } from './openrouter-models'

export const LIVE_MODEL_CACHE_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours

export interface LiveModelCacheEntry {
    timestamp: number
    models: { label: string; value: string }[]
}

const liveModelCache = new Map<string, LiveModelCacheEntry>()
let diskCacheLoaded = false

function getModelsCacheFile(): string {
    const dir = process.env.DECEMBER_CONFIG_DIR || path.join(os.homedir(), '.config', 'december')
    return path.join(dir, 'models-cache.json')
}

export function initDiskCacheSync(): void {
    if (diskCacheLoaded) return
    diskCacheLoaded = true
    try {
        const cacheFile = getModelsCacheFile()
        if (existsSync(cacheFile)) {
            const raw = readFileSync(cacheFile, 'utf-8')
            const parsed = JSON.parse(raw)
            const now = Date.now()
            for (const [k, v] of Object.entries(parsed as Record<string, LiveModelCacheEntry>)) {
                if (
                    v &&
                    typeof v.timestamp === 'number' &&
                    Array.isArray(v.models) &&
                    now - v.timestamp < LIVE_MODEL_CACHE_TTL_MS
                ) {
                    liveModelCache.set(k, v)
                }
            }
        }
    } catch {
        // Intentionally swallowed: ignore cache read errors
    }
}

export async function saveDiskCache(): Promise<void> {
    try {
        const cacheFile = getModelsCacheFile()
        const dir = path.dirname(cacheFile)
        await fs.mkdir(dir, { recursive: true }).catch(() => {})
        const obj: Record<string, LiveModelCacheEntry> = {}
        const now = Date.now()
        for (const [k, v] of liveModelCache.entries()) {
            if (now - v.timestamp < LIVE_MODEL_CACHE_TTL_MS) {
                obj[k] = v
            }
        }
        await fs.writeFile(cacheFile, JSON.stringify(obj, null, 2), 'utf-8')
    } catch {
        // Intentionally swallowed: ignore cache write errors
    }
}

export function clearProviderModelsCache(provider?: string): void {
    if (provider) {
        const prefix = `${provider.toLowerCase().trim()}:`
        for (const key of liveModelCache.keys()) {
            if (key.startsWith(prefix)) {
                liveModelCache.delete(key)
            }
        }
        saveDiskCache().catch(() => {})
    } else {
        liveModelCache.clear()
        diskCacheLoaded = false
        try {
            const cacheFile = getModelsCacheFile()
            if (existsSync(cacheFile)) {
                unlinkSync(cacheFile)
            }
        } catch {
            // Intentionally swallowed: ignore cache deletion errors
        }
    }
}

export const getCuratedProviderModels = (provider: string) => {
    const normalized = (provider || '').toLowerCase().trim()
    switch (normalized) {
        case 'anthropic':
            return [
                { label: 'Claude Opus 5', value: 'claude-opus-5' },
                { label: 'Claude Sonnet 5', value: 'claude-sonnet-5' },
                { label: 'Claude Fable 5.1', value: 'claude-fable-5-1' },
                { label: 'Claude Fable 5', value: 'claude-fable-5' },
                { label: 'Claude Haiku 4.5', value: 'claude-haiku-4.5' },
                { label: 'Claude Opus 4.8', value: 'claude-opus-4.8' },
                { label: 'Claude Opus 4.7', value: 'claude-opus-4.7' },
                { label: 'Claude Sonnet 4.6', value: 'claude-sonnet-4.6' },
                { label: 'Claude Opus 4.6', value: 'claude-opus-4.6' },
                { label: 'Claude Opus 4.5', value: 'claude-opus-4.5' },
                { label: 'Claude Sonnet 4.5', value: 'claude-sonnet-4.5' },
            ]
        case 'google':
        case 'gemini':
            return [
                { label: 'Gemini 3.8 Flash', value: 'gemini-3.8-flash' },
                { label: 'Gemini 3.7 Flash', value: 'gemini-3.7-flash' },
                { label: 'Gemini 3.6 Flash', value: 'gemini-3.6-flash' },
                { label: 'Gemini 3.5 Flash', value: 'gemini-3.5-flash' },
                { label: 'Gemini 3.5 Flash Lite', value: 'gemini-3.5-flash-lite' },
                { label: 'Gemini 3.1 Pro Preview', value: 'gemini-3.1-pro-preview' },
                { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
                { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
                { label: 'Gemini 2.5 Flash Lite', value: 'gemini-2.5-flash-lite' },
                { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
                { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
            ]
        case 'openai':
            return [
                { label: 'GPT-5.6 Sol', value: 'gpt-5.6-sol' },
                { label: 'GPT-5.6 Terra', value: 'gpt-5.6-terra' },
                { label: 'GPT-5.6 Luna', value: 'gpt-5.6-luna' },
                { label: 'GPT-5.5 Pro', value: 'gpt-5.5-pro' },
                { label: 'GPT-5.5', value: 'gpt-5.5' },
                { label: 'GPT-5.4 Pro', value: 'gpt-5.4-pro' },
                { label: 'GPT-5.4', value: 'gpt-5.4' },
                { label: 'GPT-5.4 Mini', value: 'gpt-5.4-mini' },
                { label: 'o4-mini', value: 'o4-mini' },
                { label: 'o3-pro', value: 'o3-pro' },
                { label: 'o3', value: 'o3' },
                { label: 'o3-mini', value: 'o3-mini' },
                { label: 'o1-pro', value: 'o1-pro' },
                { label: 'GPT-4.1', value: 'gpt-4.1' },
                { label: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
                { label: 'GPT-4o', value: 'gpt-4o' },
                { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
            ]
        case 'openrouter':
            return FALLBACK_OPENROUTER_MODELS
        case 'deepseek':
            return [
                { label: 'DeepSeek V4 Pro', value: 'deepseek-v4-pro' },
                { label: 'DeepSeek V4 Flash', value: 'deepseek-v4-flash' },
                { label: 'DeepSeek Chat', value: 'deepseek-chat' },
                { label: 'DeepSeek Reasoner', value: 'deepseek-reasoner' },
            ]
        case 'groq':
            return [
                { label: 'GPT-OSS 120B', value: 'openai/gpt-oss-120b' },
                { label: 'GPT-OSS 20B', value: 'openai/gpt-oss-20b' },
                { label: 'Llama 3.3 70B Versatile', value: 'llama-3.3-70b-versatile' },
                { label: 'Llama 3.1 8B Instant', value: 'llama-3.1-8b-instant' },
                { label: 'Qwen 3.6 27B', value: 'qwen/qwen3.6-27b' },
                { label: 'Qwen 3.8 27B', value: 'qwen/qwen3.8-27b' },
                { label: 'Groq Compound System', value: 'groq/compound' },
                { label: 'Groq Compound Mini', value: 'groq/compound-mini' },
            ]
        case 'huggingface':
            return [
                {
                    label: 'Llama 3.3 70B Instruct',
                    value: 'meta-llama/Llama-3.3-70B-Instruct',
                },
                { label: 'Llama 3.1 8B Instruct', value: 'meta-llama/Meta-Llama-3.1-8B-Instruct' },
                { label: 'DeepSeek V4 Flash', value: 'deepseek-ai/DeepSeek-V4-Flash' },
                { label: 'GPT-OSS 120B', value: 'openai/gpt-oss-120b' },
                { label: 'Qwen 3 Coder 30B', value: 'Qwen/Qwen3-Coder-30B-A3B-Instruct' },
                { label: 'Qwen 2.5 Coder 32B', value: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
                { label: 'Qwen 2.5 72B', value: 'Qwen/Qwen2.5-72B-Instruct' },
                { label: 'Kimi K3', value: 'moonshotai/Kimi-K3' },
            ]
        case 'kimi':
        case 'moonshot':
        case 'moonshoot':
            return [
                { label: 'Kimi K3', value: 'kimi-k3' },
                { label: 'Kimi K2.7 Code', value: 'kimi-k2.7-code' },
                { label: 'Kimi K2.7 Code Highspeed', value: 'kimi-k2.7-code-highspeed' },
                { label: 'Kimi K2.6', value: 'kimi-k2.6' },
                { label: 'Kimi K2.5', value: 'kimi-k2.5' },
            ]
        case 'mistral':
            return [
                { label: 'Mistral Large', value: 'mistral-large-latest' },
                { label: 'Mistral Medium', value: 'mistral-medium-latest' },
                { label: 'Mistral Small', value: 'mistral-small-latest' },
                { label: 'Codestral', value: 'codestral-latest' },
                { label: 'Devstral', value: 'devstral-latest' },
                { label: 'Devstral 2', value: 'devstral-2512' },
                { label: 'Magistral Small', value: 'magistral-small' },
                { label: 'Ministral 14B', value: 'ministral-14b-latest' },
                { label: 'Ministral 8B', value: 'ministral-8b-latest' },
                { label: 'Ministral 3B', value: 'ministral-3b-latest' },
                { label: 'Pixtral Large', value: 'pixtral-large-latest' },
            ]
        case 'xai':
            return [
                { label: 'Grok 4.6', value: 'grok-4.6' },
                { label: 'Grok 4.5', value: 'grok-4.5' },
                { label: 'Grok 4.3', value: 'grok-4.3' },
                { label: 'Grok 4.20', value: 'grok-4.20' },
                { label: 'Grok Build 0.1', value: 'grok-build-0.1' },
            ]
        case 'zai':
            return [
                { label: 'GLM 5.3 Flash', value: 'glm-5.3-flash' },
                { label: 'GLM 5.3', value: 'glm-5.3' },
                { label: 'GLM 5.2', value: 'glm-5.2' },
                { label: 'GLM 5.1', value: 'glm-5.1' },
                { label: 'GLM 5', value: 'glm-5' },
                { label: 'GLM 5 Turbo', value: 'glm-5-turbo' },
                { label: 'GLM 4.7', value: 'glm-4.7' },
                { label: 'GLM 4.7 Flash', value: 'glm-4.7-flash' },
                { label: 'GLM 4.5 Air', value: 'glm-4.5-air' },
                { label: 'GLM 4 Plus', value: 'glm-4-plus' },
                { label: 'GLM 4 Flash', value: 'glm-4-flash' },
            ]
        case 'nvidia':
        case 'nim':
            return [
                { label: 'GPT-OSS 120B', value: 'openai/gpt-oss-120b' },
                { label: 'GPT-OSS 20B', value: 'openai/gpt-oss-20b' },
                { label: 'Nemotron 3.5 Lightning', value: 'nvidia/nemotron-3.5-lightning-30b-a3b' },
                { label: 'Nemotron 3 Super 120B', value: 'nvidia/nemotron-3-super-120b-a12b' },
                { label: 'Nemotron 3 Ultra 550B', value: 'nvidia/nemotron-3-ultra-550b-a55b' },
                { label: 'Llama 3.2 11B Vision', value: 'meta/llama-3.2-11b-vision-instruct' },
                { label: 'Kimi K3', value: 'moonshotai/kimi-k3' },
                { label: 'MiniMax M3', value: 'minimaxai/minimax-m3' },
            ]
        case 'sambanova':
            return [
                {
                    label: 'Llama 3.3 70B Instruct',
                    value: 'Meta-Llama-3.3-70B-Instruct',
                },
                {
                    label: 'Llama 3.1 405B Instruct',
                    value: 'Meta-Llama-3.1-405B-Instruct',
                },
                { label: 'DeepSeek R1', value: 'DeepSeek-R1' },
                { label: 'DeepSeek V3', value: 'DeepSeek-V3' },
                { label: 'Llama 3.1 8B Instruct', value: 'Meta-Llama-3.1-8B-Instruct' },
                { label: 'Qwen 2.5 Coder 32B', value: 'Qwen2.5-Coder-32B-Instruct' },
            ]
        case 'cerebras':
            return [
                { label: 'GPT-OSS 120B', value: 'gpt-oss-120b' },
                { label: 'Gemma 4 31B', value: 'gemma-4-31b' },
                { label: 'Llama 3.3 70B', value: 'llama-3.3-70b' },
                { label: 'Llama 3.1 8B', value: 'llama3.1-8b' },
            ]
        case 'siliconflow':
        case 'siliconcloud':
            return [
                { label: 'DeepSeek V4 Pro', value: 'deepseek-ai/DeepSeek-V4-Pro' },
                { label: 'DeepSeek V4 Flash', value: 'deepseek-ai/DeepSeek-V4-Flash' },
                { label: 'DeepSeek R1', value: 'deepseek-ai/DeepSeek-R1' },
                { label: 'DeepSeek V3', value: 'deepseek-ai/DeepSeek-V3' },
                { label: 'GPT-OSS 120B', value: 'openai/gpt-oss-120b' },
                { label: 'Qwen 3 Coder 30B', value: 'Qwen/Qwen3-Coder-30B-A3B-Instruct' },
                { label: 'Qwen 2.5 Coder 32B', value: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
                { label: 'Qwen 2.5 72B', value: 'Qwen/Qwen2.5-72B-Instruct' },
                { label: 'GLM 5', value: 'zai-org/GLM-5' },
                { label: 'MiniMax M3', value: 'MiniMaxAI/MiniMax-M3' },
            ]
        case 'together':
        case 'togetherai':
            return [
                {
                    label: 'Llama 3.3 70B Turbo',
                    value: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
                },
                { label: 'DeepSeek V4 Pro', value: 'deepseek-ai/DeepSeek-V4-Pro' },
                { label: 'DeepSeek R1', value: 'deepseek-ai/DeepSeek-R1' },
                { label: 'DeepSeek V3', value: 'deepseek-ai/DeepSeek-V3' },
                { label: 'GPT-OSS 120B', value: 'openai/gpt-oss-120b' },
                { label: 'Kimi K3', value: 'moonshotai/Kimi-K3' },
                { label: 'GLM 5.3 Flash', value: 'zai-org/GLM-5.3-Flash' },
                { label: 'Qwen 3 Coder 480B', value: 'Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8' },
            ]
        case 'hyperbolic':
            return [
                { label: 'DeepSeek R1', value: 'deepseek-ai/DeepSeek-R1' },
                { label: 'DeepSeek V3', value: 'deepseek-ai/DeepSeek-V3' },
                { label: 'Llama 3.3 70B', value: 'meta-llama/Llama-3.3-70B-Instruct' },
                { label: 'Llama 3.1 405B', value: 'meta-llama/Meta-Llama-3.1-405B-Instruct' },
                { label: 'Llama 3.1 70B', value: 'meta-llama/Meta-Llama-3.1-70B-Instruct' },
                { label: 'Qwen 2.5 Coder 32B', value: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
                { label: 'Qwen 2.5 72B', value: 'Qwen/Qwen2.5-72B-Instruct' },
            ]
        case 'fireworks':
        case 'fireworksai':
            return [
                {
                    label: 'DeepSeek V4 Pro',
                    value: 'accounts/fireworks/models/deepseek-v4-pro-0813',
                },
                {
                    label: 'DeepSeek V4 Flash',
                    value: 'accounts/fireworks/models/deepseek-v4-flash-0731',
                },
                {
                    label: 'DeepSeek R1',
                    value: 'accounts/fireworks/models/deepseek-r1',
                },
                { label: 'DeepSeek V3', value: 'accounts/fireworks/models/deepseek-v3' },
                { label: 'Kimi K3', value: 'accounts/fireworks/models/kimi-k3' },
                { label: 'GLM 5.3 Flash', value: 'accounts/fireworks/models/glm-5p3-flash' },
                { label: 'GPT-OSS 120B', value: 'accounts/fireworks/models/gpt-oss-120b' },
                { label: 'MiniMax M3', value: 'accounts/fireworks/models/minimax-m3' },
                {
                    label: 'Llama 3.3 70B',
                    value: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
                },
                {
                    label: 'Llama 3.1 405B',
                    value: 'accounts/fireworks/models/llama-v3p1-405b-instruct',
                },
                {
                    label: 'Qwen 2.5 Coder 32B',
                    value: 'accounts/fireworks/models/qwen2p5-coder-32b-instruct',
                },
                { label: 'Qwen 2.5 72B', value: 'accounts/fireworks/models/qwen2p5-72b-instruct' },
            ]
        case 'perplexity':
            return [
                { label: 'Sonar Deep Research', value: 'sonar-deep-research' },
                { label: 'Sonar Reasoning Pro', value: 'sonar-reasoning-pro' },
                { label: 'Sonar Pro', value: 'sonar-pro' },
                { label: 'Sonar', value: 'sonar' },
            ]
        case 'cohere':
            return [
                { label: 'Command A Plus', value: 'command-a-plus-05-2026' },
                { label: 'Command A Reasoning', value: 'command-a-reasoning-08-2025' },
                { label: 'Command A', value: 'command-a-03-2025' },
                { label: 'Command R+', value: 'command-r-plus-08-2024' },
                { label: 'Command R', value: 'command-r-08-2024' },
            ]
        case 'agentrouter':
        case 'agentrouter.org':
            return [
                { label: 'GLM 5.3', value: 'glm-5.3' },
                { label: 'GPT-5.6 Sol', value: 'gpt-5.6-sol' },
                { label: 'DeepSeek V4 Flash', value: 'deepseek-v4-flash' },
                { label: 'Claude Opus 4.8', value: 'claude-opus-4-8' },
                { label: 'Claude Opus 5', value: 'claude-opus-5' },
            ]
        case 'december':
        case 'december_proxy':
            return [
                { label: 'Gemini 3.8 Flash', value: 'gemini-3.8-flash' },
                { label: 'Gemini 3.7 Flash', value: 'gemini-3.7-flash' },
                { label: 'Claude Sonnet 5', value: 'claude-sonnet-5' },
                { label: 'Claude Opus 5', value: 'claude-opus-5' },
                { label: 'GPT-5.6 Sol', value: 'gpt-5.6-sol' },
                { label: 'DeepSeek V4 Pro', value: 'deepseek-v4-pro' },
                { label: 'o4-mini', value: 'o4-mini' },
            ]
        case 'copilot':
        case 'github_copilot':
        case 'github':
            return [
                { label: 'GPT-4o', value: 'gpt-4o' },
                { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
                { label: 'GPT-4.1', value: 'gpt-4.1' },
            ]
        case 'claude':
            return getCuratedProviderModels('anthropic')
        case 'codex':
        case 'chatgpt':
            return [
                { label: 'GPT-5.4', value: 'gpt-5.4' },
                { label: 'GPT-5.4 Mini', value: 'gpt-5.4-mini' },
                { label: 'GPT-5.5', value: 'gpt-5.5' },
                { label: 'GPT-5.6 Sol', value: 'gpt-5.6-sol' },
                { label: 'GPT-5.6 Terra', value: 'gpt-5.6-terra' },
                { label: 'GPT-5.6 Luna', value: 'gpt-5.6-luna' },
            ]
        case 'antigravity':
            return getCuratedProviderModels('gemini')
        case 'minimax':
            return [
                { label: 'MiniMax M3', value: 'MiniMax-M3' },
                { label: 'MiniMax M2.7', value: 'MiniMax-M2.7' },
                { label: 'MiniMax M2.5', value: 'MiniMax-M2.5' },
                { label: 'MiniMax Text 01', value: 'MiniMax-Text-01' },
                { label: 'MiniMax VL 01', value: 'MiniMax-VL-01' },
            ]
        case 'arcee':
        case 'arceeai':
        case 'arcee-ai':
            return [
                { label: 'Trinity Large Thinking', value: 'trinity-large-thinking' },
                {
                    label: 'DeepSeek V4 Flash',
                    value: 'deepseek/deepseek-v4-flash-latest',
                },
                { label: 'DeepSeek V4 Pro', value: 'deepseek/deepseek-v4-pro' },
                {
                    label: 'DeepSeek V4 Pro 0813',
                    value: 'deepseek/deepseek-v4-pro-0813',
                },
                { label: 'GLM 5.2', value: 'zai-org/glm-5.2' },
                { label: 'Kimi K3', value: 'moonshotai/kimi-k3' },
                { label: 'Inkling Small', value: 'thinkingmachines/inkling-small' },
            ]
        case 'dashscope':
        case 'qwen':
            return [
                { label: 'Qwen 3.8 Max', value: 'qwen3.8-max' },
                { label: 'Qwen 3.8 Flash Next', value: 'qwen3.8-flash-next' },
                { label: 'Qwen 3.7 Max', value: 'qwen3.7-max' },
                { label: 'Qwen 3 Coder 30B', value: 'qwen3-coder-30b-a3b-instruct' },
                { label: 'Qwen Max Latest', value: 'qwen-max-latest' },
                { label: 'Qwen Plus Latest', value: 'qwen-plus-latest' },
                { label: 'Qwen Turbo Latest', value: 'qwen-turbo-latest' },
                { label: 'Qwen 2.5 Coder 32B', value: 'qwen2.5-coder-32b-instruct' },
                { label: 'Qwen 2.5 Coder 7B', value: 'qwen2.5-coder-7b-instruct' },
            ]
        case 'lmstudio':
            return [{ label: 'Local LM Studio Model', value: 'default' }]
        case 'llamacpp':
            return [{ label: 'Local llama.cpp Model', value: 'default' }]
        case 'ollama':
            return [
                { label: 'Qwen 2.5 Coder 7B', value: 'qwen2.5-coder:7b' },
                { label: 'Qwen 2.5 Coder 14B', value: 'qwen2.5-coder:14b' },
                { label: 'Qwen 2.5 Coder 32B', value: 'qwen2.5-coder:32b' },
                { label: 'Llama 3.3 70B', value: 'llama3.3:70b' },
                { label: 'Llama 3.1 8B', value: 'llama3.1:8b' },
                { label: 'Mistral Nemo 12B', value: 'mistral-nemo:latest' },
            ]
        default:
            return [{ label: 'Default', value: 'default' }]
    }
}

export const getProviderModels = (provider: string) => {
    const normalized = (provider || '').toLowerCase().trim()
    initDiskCacheSync()
    const now = Date.now()
    for (const [key, entry] of liveModelCache.entries()) {
        if (key.includes(':test-token:')) continue
        if (key.startsWith(`${normalized}:`) && now - entry.timestamp < LIVE_MODEL_CACHE_TTL_MS) {
            return entry.models
        }
    }
    return getCuratedProviderModels(normalized)
}

export const isToolCompatibleOllamaModel = (modelName: string): boolean => {
    if (!modelName) return false
    const lower = modelName.toLowerCase()
    const toolKeywords = [
        'qwen2.5-coder',
        'qwen2.5',
        'llama-3.3',
        'llama3.3',
        'llama-3.1',
        'llama3.1',
        'mistral-nemo',
        'codellama',
        'command-r',
        'hermes3',
        'firefunction',
    ]
    return toolKeywords.some((kw) => lower.includes(kw))
}

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export async function fetchOllamaModels(
    baseUrl: string = 'http://localhost:11434',
    fetchFn: typeof fetch = fetch
): Promise<{ label: string; value: string }[]> {
    try {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')
        const res = await fetchFn(`${cleanBaseUrl}/api/tags`)
        if (!res.ok) {
            return getProviderModels('ollama')
        }
        const data = (await res.json()) as { models?: { name: string; size: number }[] }
        if (!data.models || data.models.length === 0) {
            return getProviderModels('ollama')
        }
        const filtered = data.models.filter((m) => isToolCompatibleOllamaModel(m.name))
        if (filtered.length === 0) {
            return getProviderModels('ollama')
        }
        return filtered.map((m) => ({
            label: `${m.name} (${formatBytes(m.size)})`,
            value: m.name,
        }))
    } catch {
        // Fallback to curated tool-compatible models on network error
        return getProviderModels('ollama')
    }
}

export async function checkOllamaStatus(
    baseUrl: string = 'http://localhost:11434',
    fetchFn: typeof fetch = fetch
): Promise<{ running: boolean; models: string[]; compatibleModels: string[]; error?: string }> {
    try {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')
        const res = await fetchFn(`${cleanBaseUrl}/api/tags`)
        if (!res.ok) {
            return {
                running: false,
                models: [],
                compatibleModels: [],
                error: `HTTP error: ${res.status} ${res.statusText}`,
            }
        }
        const data = (await res.json()) as { models?: { name: string; size: number }[] }
        const allModels = (data.models || []).map((m) => m.name)
        const compatible = allModels.filter((name) => isToolCompatibleOllamaModel(name))
        return {
            running: true,
            models: allModels,
            compatibleModels: compatible,
        }
    } catch (err: any) {
        return {
            running: false,
            models: [],
            compatibleModels: [],
            error: err?.message || String(err),
        }
    }
}

export function getDefaultUrlForLocalProvider(provider: string): string {
    const normalized = (provider || '').toLowerCase()
    if (normalized === 'lmstudio') return 'http://localhost:1234'
    if (normalized === 'llamacpp') return 'http://localhost:8080'
    return 'http://localhost:11434'
}

export async function checkLocalServerStatus(
    provider: string,
    baseUrl?: string,
    fetchFn: typeof fetch = fetch
): Promise<{
    running: boolean
    models: string[]
    compatibleModels: string[]
    error?: string
}> {
    const normalized = (provider || '').toLowerCase()
    const defaultUrl = getDefaultUrlForLocalProvider(normalized)
    const url = baseUrl || defaultUrl

    if (normalized === 'ollama') {
        return checkOllamaStatus(url, fetchFn)
    }

    try {
        const cleanBaseUrl = url.replace(/\/+$/, '')
        const endpoint = cleanBaseUrl.endsWith('/v1')
            ? `${cleanBaseUrl}/models`
            : `${cleanBaseUrl}/v1/models`
        const res = await fetchFn(endpoint, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(3000),
        })

        if (!res.ok) {
            return {
                running: false,
                models: [],
                compatibleModels: [],
                error: `HTTP error: ${res.status} ${res.statusText}`,
            }
        }

        const data = (await res.json()) as { data?: { id: string }[] }
        const allModels = (data.data || []).map((m) => m.id)
        const compatible = allModels.filter((name) => isToolCompatibleOllamaModel(name))
        return {
            running: true,
            models: allModels,
            compatibleModels: compatible.length > 0 ? compatible : allModels,
        }
    } catch (err: any) {
        return {
            running: false,
            models: [],
            compatibleModels: [],
            error: err?.message || String(err),
        }
    }
}

function formatModelLabel(id: string): string {
    if (!id) return ''
    const parts = id.split(/[/:]/)
    const last = parts[parts.length - 1]
    return last
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function isChatModel(id: string): boolean {
    if (!id || typeof id !== 'string') return false
    const lower = id.toLowerCase()
    if (lower.includes('embedding')) return false
    if (lower.startsWith('copilot-search') || lower.startsWith('exec-agent')) return false
    if (lower.includes('compaction')) return false
    return true
}

export async function fetchLiveProviderModels(
    provider: string,
    apiKey?: string,
    baseUrl?: string,
    fetchFn: typeof fetch = fetch
): Promise<{ label: string; value: string }[]> {
    const normalized = (provider || '').toLowerCase().trim()
    const curated = getCuratedProviderModels(normalized)

    if (normalized === 'openrouter') {
        const cacheKey = `openrouter:${apiKey || 'none'}:${baseUrl || 'default'}`
        const cached = liveModelCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < LIVE_MODEL_CACHE_TTL_MS) {
            return cached.models
        }
        const { fetchOpenRouterModels } = await import('./openrouter-models')
        const models = await fetchOpenRouterModels(apiKey, false, fetchFn)
        if (models && models.length > 0) {
            liveModelCache.set(cacheKey, {
                timestamp: Date.now(),
                models,
            })
            saveDiskCache().catch(() => {})
        }
        return models
    }

    if (normalized === 'ollama') {
        const defaultUrl = getDefaultUrlForLocalProvider('ollama')
        const url = baseUrl || defaultUrl
        return fetchOllamaModels(url, fetchFn)
    }

    if (normalized === 'lmstudio' || normalized === 'llamacpp') {
        const status = await checkLocalServerStatus(normalized, baseUrl, fetchFn)
        if (status.running && status.compatibleModels.length > 0) {
            return status.compatibleModels.map((id) => ({
                label: id === 'default' ? getModelLabel('default') : formatModelLabel(id),
                value: id,
            }))
        }
        return curated
    }

    if (!apiKey) {
        return curated
    }

    const cacheKey = `${normalized}:${apiKey}:${baseUrl || 'default'}`
    const cached = liveModelCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < LIVE_MODEL_CACHE_TTL_MS) {
        return cached.models
    }

    try {
        let endpoint = ''
        const headers: Record<string, string> = { Accept: 'application/json' }

        if (normalized === 'google' || normalized === 'gemini') {
            const isOAuth =
                apiKey.startsWith('ya29.') ||
                apiKey.startsWith('Bearer ') ||
                apiKey.includes('.') ||
                normalized === 'gemini'
            if (isOAuth && !apiKey.startsWith('AIza')) {
                endpoint = 'https://generativelanguage.googleapis.com/v1beta/models'
                headers['Authorization'] = apiKey.startsWith('Bearer ')
                    ? apiKey
                    : `Bearer ${apiKey}`
            } else {
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
            }
        } else if (normalized === 'anthropic' || normalized === 'claude') {
            endpoint = 'https://api.anthropic.com/v1/models'
            headers['anthropic-version'] = '2023-06-01'
            const isOAuth =
                normalized === 'claude' ||
                !apiKey.startsWith('sk-ant-api') ||
                apiKey.startsWith('Bearer ')
            if (isOAuth && !apiKey.startsWith('sk-ant-api')) {
                headers['Authorization'] = apiKey.startsWith('Bearer ')
                    ? apiKey
                    : `Bearer ${apiKey}`
                headers['anthropic-beta'] = 'oauth-2024-11-18'
            } else {
                headers['x-api-key'] = apiKey
            }
        } else {
            headers['Authorization'] = `Bearer ${apiKey}`
            switch (normalized) {
                case 'openai':
                case 'codex':
                case 'chatgpt':
                    endpoint = baseUrl
                        ? `${baseUrl.replace(/\/+$/, '')}/models`
                        : 'https://api.openai.com/v1/models'
                    break
                case 'deepseek':
                    endpoint = 'https://api.deepseek.com/models'
                    break
                case 'groq':
                    endpoint = 'https://api.groq.com/openai/v1/models'
                    break
                case 'mistral':
                    endpoint = 'https://api.mistral.ai/v1/models'
                    break
                case 'xai':
                    endpoint = 'https://api.x.ai/v1/models'
                    break
                case 'zai':
                    endpoint = 'https://api.z.ai/api/coding/paas/v4/models'
                    break
                case 'together':
                case 'togetherai':
                    endpoint = 'https://api.together.xyz/v1/models'
                    break
                case 'fireworks':
                case 'fireworksai':
                    endpoint = 'https://api.fireworks.ai/inference/v1/models'
                    break
                case 'siliconflow':
                case 'siliconcloud':
                    endpoint = 'https://api.siliconflow.cn/v1/models'
                    break
                case 'dashscope':
                case 'qwen':
                    endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/models'
                    break
                case 'minimax':
                    endpoint = 'https://api.minimax.chat/v1/models'
                    break
                case 'cerebras':
                    endpoint = 'https://api.cerebras.ai/v1/models'
                    break
                case 'sambanova':
                    endpoint = 'https://api.sambanova.ai/v1/models'
                    break
                case 'nvidia':
                case 'nim':
                    endpoint = 'https://integrate.api.nvidia.com/v1/models'
                    break
                case 'cohere':
                    endpoint = 'https://api.cohere.com/v2/models'
                    break
                case 'kimi':
                case 'moonshot':
                case 'moonshoot':
                    endpoint = 'https://api.moonshot.ai/v1/models'
                    break
                case 'agentrouter':
                case 'agentrouter.org':
                    endpoint = 'https://agentrouter.org/v1/models'
                    headers['User-Agent'] = 'claude-cli/2.1.0 (external, sdk-cli)'
                    break
                case 'huggingface':
                    endpoint = 'https://router.huggingface.co/v1/models'
                    break
                case 'hyperbolic':
                    endpoint = 'https://api.hyperbolic.xyz/v1/models'
                    break
                case 'arcee':
                case 'arceeai':
                case 'arcee-ai':
                    endpoint = 'https://api.arcee.ai/api/v1/models'
                    break
                case 'december':
                case 'december_proxy': {
                    const serverUrl = process.env.SERVER_URL || 'https://api.trydecember.com'
                    endpoint = `${serverUrl.replace(/\/+$/, '')}/api/v1/cli/models`
                    break
                }
                case 'copilot':
                case 'github_copilot':
                case 'github':
                    endpoint = 'https://api.individual.githubcopilot.com/models'
                    headers['Editor-Version'] = 'vscode/1.95.0'
                    headers['Editor-Plugin-Version'] = 'copilot/1.240.0'
                    headers['User-Agent'] = 'GithubCopilot/1.240.0'
                    break
                default:
                    if (baseUrl) {
                        const clean = baseUrl.replace(/\/+$/, '')
                        endpoint = clean.endsWith('/v1') ? `${clean}/models` : `${clean}/v1/models`
                    }
                    break
            }
        }

        if (!endpoint) {
            return curated
        }

        const res = await fetchFn(endpoint, {
            headers,
            signal: AbortSignal.timeout(3500),
        })

        if (!res.ok) {
            return curated
        }

        const json = (await res.json()) as any
        const liveItems: { label: string; value: string }[] = []

        if (normalized === 'google' || normalized === 'gemini') {
            const rawModels = json.models || []
            for (const m of rawModels) {
                const id = (m.name || '').replace(/^models\//, '')
                if (id && (id.includes('gemini') || id.includes('gemma'))) {
                    liveItems.push({
                        label: m.displayName || formatModelLabel(id),
                        value: id,
                    })
                }
            }
        } else if (normalized === 'anthropic' || normalized === 'claude') {
            const rawModels = json.data || []
            for (const m of rawModels) {
                if (m.id) {
                    liveItems.push({
                        label: m.display_name || formatModelLabel(m.id),
                        value: m.id,
                    })
                }
            }
        } else if (Array.isArray(json.data)) {
            for (const m of json.data) {
                const id = m.id || m.name
                if (id && typeof id === 'string' && isChatModel(id)) {
                    liveItems.push({
                        label: formatModelLabel(id),
                        value: id,
                    })
                }
            }
        } else if (Array.isArray(json.models)) {
            for (const m of json.models) {
                const id = typeof m === 'string' ? m : m.name || m.id
                if (id && typeof id === 'string' && isChatModel(id)) {
                    liveItems.push({
                        label: formatModelLabel(id),
                        value: id,
                    })
                }
            }
        }

        if (liveItems.length === 0) {
            return curated
        }

        const seen = new Set<string>()
        const merged: { label: string; value: string }[] = []

        for (const m of curated) {
            seen.add(m.value)
            merged.push(m)
        }

        for (const item of liveItems) {
            if (!seen.has(item.value)) {
                seen.add(item.value)
                merged.push(item)
            }
        }

        liveModelCache.set(cacheKey, {
            timestamp: Date.now(),
            models: merged,
        })
        saveDiskCache().catch(() => {})

        return merged
    } catch {
        // Intentionally swallowed: return curated fallback models on timeout or network error
        return curated
    }
}

export const getModelLabel = (value: string) => {
    const allProviders = [
        'anthropic',
        'google',
        'openai',
        'openrouter',
        'deepseek',
        'groq',
        'huggingface',
        'kimi',
        'mistral',
        'xai',
        'zai',
        'nvidia',
        'sambanova',
        'cerebras',
        'siliconflow',
        'together',
        'hyperbolic',
        'fireworks',
        'perplexity',
        'cohere',
        'agentrouter',
        'copilot',
        'claude',
        'codex',
        'minimax',
        'dashscope',
        'lmstudio',
        'llamacpp',
        'ollama',
        'arcee',
        'december_proxy',
    ]
    for (const p of allProviders) {
        const models = getProviderModels(p)
        const found = models.find((m) => m.value === value)
        if (found) return found.label
    }
    return value
}

export const isValidModelForProvider = (provider: string, model?: string): boolean => {
    if (!model) return false
    const normalized = (provider || '').toLowerCase().trim()
    if (normalized === 'openrouter' && (model.includes('/') || model.includes(':'))) return true
    if (normalized === 'agentrouter' && (model.includes('/') || model.includes(':'))) return true
    if (normalized === 'arcee' && (model.includes('/') || model.includes(':'))) return true
    if (normalized === 'ollama') return isToolCompatibleOllamaModel(model)

    const models = getProviderModels(normalized)
    if (models.some((m) => m.value === model)) return true

    // Check cached live models for dynamic additions within 48h TTL
    const now = Date.now()
    for (const [key, entry] of liveModelCache.entries()) {
        if (key.startsWith(`${normalized}:`) && now - entry.timestamp < LIVE_MODEL_CACHE_TTL_MS) {
            if (entry.models.some((m) => m.value === model)) return true
        }
    }

    return false
}

export const getDefaultModelForProvider = (provider: string): string => {
    const normalized = (provider || '').toLowerCase().trim()
    if (normalized === 'ollama') {
        return 'qwen2.5-coder:7b'
    }
    if (normalized === 'lmstudio' || normalized === 'llamacpp') {
        return 'default'
    }
    const models = getProviderModels(provider)
    if (models && models.length > 0) {
        return models[0].value
    }
    return 'gemini-3.8-flash'
}

export const ensureValidModelForProvider = (provider: string, model?: string): string => {
    if (model && isValidModelForProvider(provider, model)) {
        return model
    }
    return getDefaultModelForProvider(provider)
}

export { getModelContextWindow }
