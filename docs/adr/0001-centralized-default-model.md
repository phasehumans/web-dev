# 1. Centralized Admin Default Model Configuration

Date: 2026-08-11

## Status

Accepted

## Context

Previously, December web users could select different LLM models (e.g. Claude Sonnet, GPT-5.5, Gemini Pro) directly from the UI prompt input bar and prompt footers. This required client-side model state management, Pro subscription gating per model, and passing model overrides across frontend components and streaming endpoints.

To streamline the user experience and ensure system administrators have full authority over model choice and cost allocation in December Cloud, end-user model selection needed to be replaced by a centralized admin default model setup.

## Decision

1. **Remove Web Model Selector UI**: Completely remove the model selector dropdowns, model selection badges, and model selection state from `apps/web` (`ChatPromptInput`, `PromptFooter`, `ChatThread`, `WorkspaceScreen`, `AppContentView`, etc.).
2. **Server-Side Default Model Resolution**: Web generation and chat requests omit client-side model parameters, enabling `apps/server` to apply the default model configured by the administrator (e.g., via `AUTO_MODEL` environment variable).
3. **Uniform Access Across User Tiers**: Model execution applies uniformly to all user tiers without client-side model gating or tier-based selector restrictions.

## Consequences

- Simplified frontend UI and removed redundant model state management.
- Complete admin control over default LLM model selection and cost management on the backend.
- Cleaner API requests sent from the web app to backend streaming services.
