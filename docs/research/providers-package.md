# Research & Architecture Report: `@december/providers` Package

**Target Location**: `packages/providers`

---

## 1. Overview & Purpose

The `@december/providers` package ([packages/providers/package.json](file:///home/chaitanya/code/december/packages/providers/package.json#L1-L29)) serves as the unified, stream-first Large Language Model (LLM) abstraction layer for the December application workspace.

Its primary purpose is to decouple downstream application modules—such as the autonomous agent runtime ([packages/agent](file:///home/chaitanya/code/december/packages/agent/src/agent.ts#L5)), CLI application ([apps/cli](file:///home/chaitanya/code/december/apps/cli/src/utils/provider-factory.ts#L1-L39)), and sidecar ([apps/sidecar](file:///home/chaitanya/code/december/apps/sidecar/index.ts#L9))—from vendor-specific LLM SDKs and API endpoints.

Key capabilities provided by the package include:

- **Normalized Data Contracts**: Uniform message formats, tool definitions, tool call representations, and usage accounting across all vendors ([packages/providers/src/types.ts](file:///home/chaitanya/code/december/packages/providers/src/types.ts#L1-L45)).
- **Stream Normalization**: Asynchronous generator-based streaming yielding standardized `ProviderStreamChunk` items (text, thinking deltas, tool calls/deltas, and token usage) ([packages/providers/src/types.ts#L22-L28](file:///home/chaitanya/code/december/packages/providers/src/types.ts#L22-L28)).
- **Multi-Vendor Support**: Out-of-the-box support for major AI providers (OpenAI, Anthropic, Google Gemini, OpenRouter) and OpenAI-compatible endpoints (DeepSeek, Groq, HuggingFace, Kimi, Mistral, Moonshot, xAI, ZAI).
- **Dynamic Provider Registry**: In-memory registry enabling runtime registration and resolution of provider implementations by string identifiers ([packages/providers/src/registry.ts](file:///home/chaitanya/code/december/packages/providers/src/registry.ts#L1-L20)).

---

## 2. Module Structure

```
packages/providers/
├── package.json              # Package manifest (@december/providers v0.2.20)
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── index.ts              # Public API barrel export
│   ├── types.ts              # Centralized interface and type definitions
│   ├── models.ts             # Model metadata (context windows) and createProvider helper
│   ├── registry.ts           # Centralized in-memory LLMProvider registry
│   └── providers/            # Vendor-specific provider implementations
│       ├── openai.ts         # OpenAI provider implementation & base class
│       ├── anthropic.ts      # Anthropic (Claude) provider implementation
│       ├── gemini.ts         # Google Gemini provider implementation & schema sanitizer
│       ├── openrouter.ts     # OpenRouter provider wrapper
│       ├── deepseek.ts       # DeepSeek subprovider (OpenAI-compatible)
│       ├── groq.ts           # Groq subprovider (OpenAI-compatible)
│       ├── huggingface.ts    # HuggingFace subprovider (OpenAI-compatible)
│       ├── kimi.ts           # Kimi subprovider (OpenAI-compatible)
│       ├── mistral.ts        # Mistral subprovider (OpenAI-compatible)
│       ├── moonshot.ts       # Moonshot subprovider (OpenAI-compatible)
│       ├── xai.ts            # xAI subprovider (OpenAI-compatible)
│       └── zai.ts            # ZAI subprovider (OpenAI-compatible)
└── test/
    ├── msw-handlers.ts       # MSW network mock handlers
    ├── msw-server.ts         # MSW node server setup
    ├── unit/                 # Unit tests (registry, subproviders, openrouter)
    └── integration/          # Integration tests (Anthropic, Gemini, OpenAI, MSW)
```

---

## 3. Core Concepts & Key Abstractions

### 3.1 Standard Interface: `LLMProvider`

The foundation of the package is the `LLMProvider` interface ([packages/providers/src/types.ts#L29-L45](file:///home/chaitanya/code/december/packages/providers/src/types.ts#L29-L45)):

```typescript
export interface LLMProvider {
    id: string
    stream(
        messages: Message[],
        tools?: ProviderTool[],
        systemPrompt?: string,
        modelOptions?: Record<string, any>,
        signal?: AbortSignal
    ): AsyncGenerator<ProviderStreamChunk, void, unknown>
}
```

### 3.2 Unified Message & Tool Models

- **`Role`**: `'system' | 'user' | 'assistant' | 'tool'` ([types.ts:L1](file:///home/chaitanya/code/december/packages/providers/src/types.ts#L1))
- **`Message`**: Standard representation of conversational turns, supporting assistant tool calls (`toolCalls?: ToolCall[]`) and tool result outputs (`toolCallId?: string`) ([types.ts:L9-L14](file:///home/chaitanya/code/december/packages/providers/src/types.ts#L9-L14)).
- **`ProviderTool`**: Generic tool definition containing `name`, `description`, and `inputSchema` (JSON schema) ([types.ts:L16-L20](file:///home/chaitanya/code/december/packages/providers/src/types.ts#L16-L20)).

### 3.3 Stream Normalization: `ProviderStreamChunk`

Streaming responses are standardized using a discriminated union ([types.ts:L22-L27](file:///home/chaitanya/code/december/packages/providers/src/types.ts#L22-L27)):

- `{ type: 'text'; text: string }`: Incremental text output.
- `{ type: 'thinking_delta'; text: string }`: Incremental reasoning/thinking output.
- `{ type: 'tool_call'; toolCall: ToolCall }`: Complete tool call invocation.
- `{ type: 'tool_call_delta'; id: string; name?: string; inputDelta: string }`: Streamed tool argument fragments.
- `{ type: 'usage'; promptTokens: number; completionTokens: number }`: Token usage metrics.

### 3.4 Context Window Metadata

Model context window limits are stored in `MODEL_CONTEXT_WINDOWS` ([packages/providers/src/models.ts#L3-L9](file:///home/chaitanya/code/december/packages/providers/src/models.ts#L3-L9)), mapping model names (e.g. `claude-3-5-sonnet-20241022`, `gpt-4o`) to maximum token counts. This is consumed by `@december/agent` for context window compaction ([packages/agent/src/utils/compaction.ts#L1-L3](file:///home/chaitanya/code/december/packages/agent/src/utils/compaction.ts#L1-L3)).

### 3.5 Provider Registry

The registry ([packages/providers/src/registry.ts#L1-L20](file:///home/chaitanya/code/december/packages/providers/src/registry.ts#L1-L20)) maintains an in-memory `Map<string, LLMProvider>`. It exposes:

- `registerProvider(provider: LLMProvider)`
- `getProvider(id: string): LLMProvider` (throws descriptive error if missing)
- `getAllProviders(): LLMProvider[]`

---

## 4. Key Design Patterns & Provider Implementations

### 4.1 Functional Factory + OOP Wrapper Pattern

Providers support both functional factory instantiations and class-based instantiations:

- **OpenAI**: `openaiProvider(baseURL?, apiKey?, defaultHeaders?)` ([openai.ts:L6-L135](file:///home/chaitanya/code/december/packages/providers/src/providers/openai.ts#L6-L135)) and `OpenAIProvider` class ([openai.ts:L137-L154](file:///home/chaitanya/code/december/packages/providers/src/providers/openai.ts#L137-L154)).
- **Anthropic**: `anthropicProvider(baseURL?, apiKey?)` ([anthropic.ts:L7-L129](file:///home/chaitanya/code/december/packages/providers/src/providers/anthropic.ts#L7-L129)) and `AnthropicProvider` class ([anthropic.ts:L131-L158](file:///home/chaitanya/code/december/packages/providers/src/providers/anthropic.ts#L131-L158)).
- **Gemini**: `geminiProvider(apiKey?)` ([gemini.ts:L47-L239](file:///home/chaitanya/code/december/packages/providers/src/providers/gemini.ts#L47-L239)) and `GeminiProvider` class ([gemini.ts:L241-L258](file:///home/chaitanya/code/december/packages/providers/src/providers/gemini.ts#L241-L258)).

### 4.2 OpenAI-Compatible Endpoint Extension

Subproviders inherit from `OpenAIProvider` and override the base URL and API key environment variables:

- `DeepSeekProvider` (`https://api.deepseek.com`, `DEEPSEEK_API_KEY`) ([deepseek.ts:L1-L10](file:///home/chaitanya/code/december/packages/providers/src/providers/deepseek.ts#L1-L10))
- `GroqProvider` (`https://api.groq.com/openai/v1`, `GROQ_API_KEY`) ([groq.ts:L1-L10](file:///home/chaitanya/code/december/packages/providers/src/providers/groq.ts#L1-L10))
- `HuggingFaceProvider` (`https://router.huggingface.co/v1`, `HF_TOKEN`/`HUGGINGFACE_API_KEY`) ([huggingface.ts:L1-L13](file:///home/chaitanya/code/december/packages/providers/src/providers/huggingface.ts#L1-L13))
- `OpenRouterProvider` wraps `openaiProvider` with custom headers (`HTTP-Referer`, `X-Title`) ([openrouter.ts:L5-L17](file:///home/chaitanya/code/december/packages/providers/src/providers/openrouter.ts#L5-L17))

### 4.3 Vendor-Specific Translation & Sanitization Logic

- **Gemini Schema Sanitization**: Google Gemini requires specific JSON schema formats (e.g. converting `anyOf` with `const` into `enum`) performed recursively by `sanitizeSchemaForGemini` ([gemini.ts:L8-L45](file:///home/chaitanya/code/december/packages/providers/src/providers/gemini.ts#L8-L45)).
- **Gemini Thought Signature & Function Call ID Serialization**: Custom metadata like `thoughtSignature` and call IDs are JSON-encoded inside tool call ID strings to persist state across turns ([gemini.ts:L71-L96](file:///home/chaitanya/code/december/packages/providers/src/providers/gemini.ts#L71-L96), [gemini.ts:L205-L226](file:///home/chaitanya/code/december/packages/providers/src/providers/gemini.ts#L205-L226)).
- **Anthropic Tool Result Conversion**: Tool results are transformed to Anthropic's native `tool_result` content block inside `user` role messages ([anthropic.ts:L30-L40](file:///home/chaitanya/code/december/packages/providers/src/providers/anthropic.ts#L30-L40)).

---

## 5. Data Flow & Integration Points

```
[ Downstream Caller ] (Agent / CLI / Sidecar)
         │
         │  1. stream(messages, tools, systemPrompt, options)
         ▼
[ LLMProvider Implementation ] (OpenAI / Anthropic / Gemini / etc.)
         │
         │  2. Translate Message[] & ProviderTool[] -> Vendor Format
         │  3. Call Vendor SDK streaming API
         ▼
[ Vendor API Endpoint ] (HTTP / SSE)
         │
         │  4. Stream native events / chunks back
         ▼
[ Provider Async Generator ]
         │
         │  5. Yield normalized ProviderStreamChunk objects
         ▼
[ Downstream Consumer ] (Processes text deltas, tool calls, & usage)
```

### Application Integration

1. **`apps/cli`**: Uses `instantiateProvider` ([apps/cli/src/utils/provider-factory.ts#L8-L38](file:///home/chaitanya/code/december/apps/cli/src/utils/provider-factory.ts#L8-L38)) to route requested provider flags (`openai`, `anthropic`, `gemini`, `openrouter`, etc.) to provider factory functions.
2. **`packages/agent`**: Accepts `LLMProvider` in `AgentConfig` ([packages/agent/src/agent.ts#L12](file:///home/chaitanya/code/december/packages/agent/src/agent.ts#L12)) and invokes `this.llm.stream(...)` during autonomous execution loops.

---

## 6. Testing & Quality Assurance Architecture

- **Runner**: Bun test runner (`bun test`) ([package.json:L10-L12](file:///home/chaitanya/code/december/packages/providers/package.json#L10-L12)).
- **Unit Tests**: Validate registry operations ([test/unit/registry.unit.test.ts](file:///home/chaitanya/code/december/packages/providers/test/unit/registry.unit.test.ts)) and subprovider instantiation ([test/unit/subproviders.unit.test.ts](file:///home/chaitanya/code/december/packages/providers/test/unit/subproviders.unit.test.ts)).
- **Integration Tests**: Mock vendor SDKs ([test/integration/anthropic.integration.test.ts](file:///home/chaitanya/code/december/packages/providers/test/integration/anthropic.integration.test.ts)) or use MSW (`msw`) HTTP interception ([test/msw-handlers.ts](file:///home/chaitanya/code/december/packages/providers/test/msw-handlers.ts)) to verify request formatting and async generator output chunks.
