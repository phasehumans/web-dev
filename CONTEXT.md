# Context: December Cloud & Model Architecture

## Model Selection & Execution Policy

In December Cloud (web application), end-user model selection UI has been removed. All model execution requests omit user-specified model overrides, defaulting to the centralized admin-configured default model on the server (configured via `DEFAULT_MODEL` / `AUTO_MODEL` environment variables or server settings).

### Key Rules

- **Centralized Model Configuration**: System administrators control the LLM model utilized for project generation and chat interactions via server configuration.
- **Uniform User Tier Access**: Default model selection applies uniformly across all user subscription tiers (Free and Pro) without client-side model gating.
- **Web App Decoupling**: The web frontend (`apps/web`) does not send `model` payload parameters to generation SSE/WebSocket streaming endpoints, allowing backend services to resolve execution models dynamically.
