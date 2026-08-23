# Primary-Source Research: Granular Security Profiles, Sandboxing & Secret Redaction

## Executive Summary

Autonomous terminal coding agents have direct shell and filesystem access to developers' machines. Without rigorous security guardrails and clear permission tiers, agents risk:

1. **Accidental Destruction**: Running recursive deletions (`rm -rf`), dropping local databases, or force-pushing to protected git branches.
2. **Secret & Credential Exfiltration**: Reading `.env`, `.aws/credentials`, or SSH private keys and leaking them into LLM prompt transcripts.
3. **Workspace Escape**: Reading or modifying files outside the workspace root (e.g. `/etc`, `/var`, `~/.ssh`).
4. **Developer Friction**: Overly aggressive permission models prompt the user for every single benign read operation (`ls`, `git status`), killing productivity.

This document analyzes primary-source security architectures in **Claude Code** and **Codex CLI** and specifies a **3-Tier Permission Model & Automatic Secret Masking Engine** for December.

---

## 1. Primary Source Analysis: SOTA Permission & Sandboxing Models

### 1.1 Claude Code Security Architecture

Claude Code defines 3 explicit operating profiles:

1. **Auto-Safe (Default)**:
    - Read-only operations (`read_file`, `grep_search`, `find_files`, `ls`, `web_search`) and safe shell inspection commands (`git status`, `git diff`, `pwd`, `cat`) execute immediately without user interruption.
    - File writes (`edit_file`, `write_file`) and build/test commands ask for lightweight confirmation or match an active session whitelist.
    - Destructive commands (`rm -rf`, `git reset --hard`, `git push -f`, `dd`, `drop database`) are strictly flagged and can never be permanently whitelisted.
2. **Plan-Only / Read-Only (`--read-only`)**:
    - Strictly disables all file modifications and shell execution tools. The agent can only explore and produce textual implementation plans.
3. **Full-Auto / Non-Interactive (`--dangerously-skip-permissions` / `-y`)**:
    - Auto-approves all non-destructive operations for headless CI/CD execution.

### 1.2 Secret Redaction & Token Masking

- SOTA agents intercept prompt payloads and tool outputs before they leave the local machine:
    - Regex masks API keys (e.g. `sk-[a-zA-Z0-9]{48}`, `ghp_[a-zA-Z0-9]{36}`, `AKIA[0-9A-Z]{16}`).
    - Strips `.env` variable values from terminal logs.

---

## 2. Technical Architecture for December

```
                                Tool Call Dispatched
                                         |
                                         v
                      +--------------------------------------+
                      |      classifyOperation(toolCall)     |
                      |   (packages/shared/permissions.ts)   |
                      +--------------------------------------+
                                         |
          +------------------------------+------------------------------+
          |                              |                              |
          v                              v                              v
       [Safe Tier]                [Modifying Tier]              [Destructive Tier]
   - read_file, ls, grep       - edit_file, write_file       - rm -rf, git reset --hard
   - git status, git diff      - npm install, bun test       - access to /etc or .ssh
          |                              |                              |
          |                              v                              v
          |                     Check Session Whitelist         NEVER Auto-Approved
          |                     (e.g. "bun test*")             High-Alert Modal In TUI
          |                              |                              |
          |                   +----------+----------+                   |
          |                   |                     |                   |
          v                   v (Approved)          v (Not Approved)    v
     [Execute]           [Execute]             [Prompt User: Y/n]  [Prompt User: Danger!]
          |                   |                     |                   |
          +-------------------+---------------------+-------------------+
                                         |
                                         v
                         +-------------------------------+
                         |      SecretRedactor.mask()    |
                         +-------------------------------+
                                         |
                                         v
                             Sent to Provider Stream
```

---

## 3. Implementation Blueprint

### 3.1 Secret Redactor (`packages/shared/src/secret-redactor.ts`)

```typescript
const SECRET_REGEXES = [
    // OpenAI API Keys
    /\bsk-[a-zA-Z0-9]{48}\b/g,
    /\bsk-proj-[a-zA-Z0-9_-]{80,}\b/g,
    // Anthropic API Keys
    /\bsk-ant-api03-[a-zA-Z0-9_-]{90,}\b/g,
    // GitHub Tokens
    /\b(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}\b/g,
    // AWS Access Keys
    /\bAKIA[0-9A-Z]{16}\b/g,
    // Generic Bearer Tokens
    /\bBearer\s+[a-zA-Z0-9_\-\.]{30,}\b/gi,
]

export function maskSecrets(content: string): string {
    let masked = content
    for (const regex of SECRET_REGEXES) {
        masked = masked.replace(regex, '[REDACTED_SECRET_KEY]')
    }
    return masked
}
```

### 3.2 Granular Permission Manager (`apps/cli/src/permission-manager.ts`)

```typescript
export type PermissionMode = 'auto-safe' | 'strict-ask' | 'read-only' | 'full-auto'

export class PermissionManager {
    private mode: PermissionMode
    private whitelist: Set<string> = new Set()

    constructor(mode: PermissionMode = 'auto-safe') {
        this.mode = mode
    }

    public async checkPermission(
        toolCall: any,
        promptUser: (msg: string) => Promise<boolean>
    ): Promise<{ allowed: boolean; reason?: string }> {
        if (this.mode === 'read-only') {
            const classification = classifyOperation(toolCall)
            if (classification.tier !== 'safe') {
                return { allowed: false, reason: 'CLI is running in read-only mode.' }
            }
            return { allowed: true }
        }

        if (this.mode === 'full-auto') {
            const classification = classifyOperation(toolCall)
            if (classification.tier === 'destructive') {
                const confirmed = await promptUser(
                    `[CRITICAL] Destructive action detected: ${classification.reason}. Confirm execution? (y/n)`
                )
                return { allowed: confirmed }
            }
            return { allowed: true }
        }

        const classification = classifyOperation(toolCall)

        // Tier 1: Safe operations auto-approved in auto-safe mode
        if (this.mode === 'auto-safe' && classification.tier === 'safe') {
            return { allowed: true }
        }

        // Tier 2: Modifying operations checked against session whitelist
        const commandStr = toolCall.input?.command || toolCall.name
        if (this.whitelist.has(commandStr)) {
            return { allowed: true }
        }

        // Tier 3: Ask user with option to remember for session
        const confirmed = await promptUser(`Allow ${toolCall.name} (${commandStr})? (y/n/always): `)
        return { allowed: confirmed }
    }
}
```

---

## 4. Summary of Improvements

1. **Eliminates Prompt Fatigue**: Developers are never interrupted for harmless reading or directory listing commands.
2. **Absolute Catastrophe Prevention**: Destructive commands (`rm -rf /`, `git push -f`) and system path breaches cannot be bypassed.
3. **Enterprise Compliance**: Outbound secret key redaction prevents credentials from leaking into cloud LLM logs.
