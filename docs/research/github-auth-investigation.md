# GitHub OAuth / Login / Signup Investigation Report

## Executive Summary

An investigation was conducted into the GitHub OAuth ("Continue with GitHub") flow across both frontend and backend packages in this repository. Several key root causes and technical deficiencies were identified that break GitHub authentication or degrade user experience.

---

## 1. OAuth Architecture & Flow Overview

1. **Frontend Trigger** ([`apps/web/src/features/auth/hooks/useAuthMutations.ts`](file:///home/chaitanya/code/december/apps/web/src/features/auth/hooks/useAuthMutations.ts#L162-L186))
    - User clicks **"Continue with GitHub"** in `AuthModal`.
    - `githubLogin()` constructs the authorization URL: `https://github.com/login/oauth/authorize?client_id=${clientId}&state=auth&scope=user:email%20repo` and opens a popup (`window.open`).
    - Attaches a `message` event listener on `window` to receive the authorization code post-redirect.

2. **Popup Callback** ([`apps/web/src/features/auth/components/GithubCallback.tsx`](file:///home/chaitanya/code/december/apps/web/src/features/auth/components/GithubCallback.tsx#L3-L17))
    - GitHub redirects to `/github/callback?code=...` (handled by [`apps/web/src/frontend.tsx`](file:///home/chaitanya/code/december/apps/web/src/frontend.tsx#L26)).
    - `GithubCallback` extracts `code` from search params and posts a message back to `window.opener`: `{ type: 'GITHUB_LOGIN_SUCCESS', code }`.

3. **Backend Exchange** ([`apps/server/src/modules/auth/auth.controller.ts`](file:///home/chaitanya/code/december/apps/server/src/modules/auth/auth.controller.ts#L141-L232))
    - Frontend calls `POST /api/v1/auth/github` with `{ code }`.
    - Backend exchanges `code` for `access_token` via `POST https://github.com/login/oauth/access_token` using `axios`.
    - Backend fetches user profile (`GET https://api.github.com/user`) and email details (`GET https://api.github.com/user/emails`).
    - Backend calls [`authService.github`](file:///home/chaitanya/code/december/apps/server/src/modules/auth/auth.service.ts#L395-L468) to log in or register the user, sets authentication cookies, and links GitHub integration details via [`integrationsService.connectGithub`](file:///home/chaitanya/code/december/apps/server/src/modules/integration/integration.service.ts#L172-L206).

---

## 2. Identified Root Causes & Deficiencies

### **Issue 1: Frontend Client ID Mismatch & Hardcoded Fallback**

- **Location**: [`apps/web/src/features/auth/hooks/useAuthMutations.ts`](file:///home/chaitanya/code/december/apps/web/src/features/auth/hooks/useAuthMutations.ts#L163-L165)
- **Problem**:
    ```ts
    const clientId =
        (typeof process !== 'undefined' ? process.env.GITHUB_CLIENT_ID : undefined) ||
        'Ov23liFGkTAwCW7E8gtk'
    ```
    In browser bundles (Vite / Bun), `process.env.GITHUB_CLIENT_ID` is `undefined`. Unlike [`apps/web/src/features/profile/api/profile.ts`](file:///home/chaitanya/code/december/apps/web/src/features/profile/api/profile.ts#L99-L104) which retrieves environment settings correctly via `getClientEnv()`, `useAuthMutations.ts` falls back to the hardcoded dummy Client ID (`'Ov23liFGkTAwCW7E8gtk'`).
- **Impact**: The frontend requests an authorization code for `'Ov23liFGkTAwCW7E8gtk'`. When the backend tries to exchange this authorization code using `env.GITHUB_CLIENT_ID` (from server `.env`), GitHub rejects it with `bad_verification_code` due to a Client ID mismatch.

### **Issue 2: Swallowed GitHub OAuth Error Responses in Backend**

- **Location**: [`apps/server/src/modules/auth/auth.controller.ts`](file:///home/chaitanya/code/december/apps/server/src/modules/auth/auth.controller.ts#L150-L174)
- **Problem**:
  GitHub's OAuth token endpoint returns HTTP `200 OK` even when an authorization failure occurs (e.g. `bad_verification_code`, `redirect_uri_mismatch`, `invalid_client`), returning `{ error: "...", error_description: "..." }` in the JSON response body.
  Because the HTTP status code is 200, `axios.post` does not throw an error into the `catch` block.
- **Impact**: `access_token` is `undefined`, causing the backend to throw a generic `'github access token not found'` error while obscuring GitHub's actual error message (`error_description`).

### **Issue 3: Missing `redirect_uri` Parameter in Token Exchange**

- **Location**: [`apps/server/src/modules/auth/auth.controller.ts`](file:///home/chaitanya/code/december/apps/server/src/modules/auth/auth.controller.ts#L151-L157)
- **Problem**: The backend `axios.post` request does not include `redirect_uri` in the token exchange payload.
- **Impact**: If the GitHub OAuth App configuration requires an explicit callback URL match, GitHub returns `redirect_uri_mismatch`.

### **Issue 4: Potential Unhandled Exception on Non-Array GitHub Emails Response**

- **Location**: [`apps/server/src/modules/auth/auth.controller.ts`](file:///home/chaitanya/code/december/apps/server/src/modules/auth/auth.controller.ts#L189-L198)
- **Problem**:
    ```ts
    const primaryEmailObj = emailsResponse.data.find((e: any) => e.primary)
    ```
    `emailsResponse.data` is assumed to be an array without checking `Array.isArray(emailsResponse.data)`.
- **Impact**: If GitHub returns an error payload (e.g. rate limit exceeded or invalid scope `{ message: "..." }`), `.find()` throws a runtime `TypeError: emailsResponse.data.find is not a function`, leading to an unhandled 500 server crash.

### **Issue 5: Missing `@unique` Database Constraint on `githubId`**

- **Location**: [`packages/database/prisma/schema.prisma`](file:///home/chaitanya/code/december/packages/database/prisma/schema.prisma#L21)
- **Problem**: `githubId String?` on the `User` model lacks the `@unique` constraint.
- **Impact**: In [`authService.github`](file:///home/chaitanya/code/december/apps/server/src/modules/auth/auth.service.ts#L400-L408), if a user's GitHub primary email changes or is unverified, `findUserByEmail` returns `null` and calls `createUser`. Multiple user records can be created with identical `githubId` values, leading to data integrity issues.

### **Issue 6: Notification Spam on Every GitHub Login**

- **Location**: [`apps/server/src/modules/integration/integration.service.ts`](file:///home/chaitanya/code/december/apps/server/src/modules/integration/integration.service.ts#L188-L197) called by [`auth.controller.ts`](file:///home/chaitanya/code/december/apps/server/src/modules/auth/auth.controller.ts#L221-L229)
- **Problem**: `integrationsService.connectGithub` sends a system notification ("GitHub Connected") on every single login attempt.
- **Impact**: Existing users receive repetitive notifications each time they sign in with GitHub.

### **Issue 7: Leaking Popup Message Listener**

- **Location**: [`apps/web/src/features/auth/hooks/useAuthMutations.ts`](file:///home/chaitanya/code/december/apps/web/src/features/auth/hooks/useAuthMutations.ts#L168-L185)
- **Problem**: `window.addEventListener('message', handleMessage)` is registered when opening the OAuth popup, but no cleanup occurs if the user closes the popup without authorizing.
- **Impact**: Event listeners accumulate in the DOM and user cancellation is unhandled.

---

## 3. Recommended Remediation Plan

1. **Frontend Client ID Resolution**:
    - In [`apps/web/src/features/auth/hooks/useAuthMutations.ts`](file:///home/chaitanya/code/december/apps/web/src/features/auth/hooks/useAuthMutations.ts#L163), retrieve client config using `getClientEnv('GITHUB_CLIENT_ID')` or runtime configuration to ensure frontend Client ID matches backend `env.GITHUB_CLIENT_ID`.
2. **Backend Error Extraction**:
    - In [`apps/server/src/modules/auth/auth.controller.ts`](file:///home/chaitanya/code/december/apps/server/src/modules/auth/auth.controller.ts#L150-L174), check `tokenResponse.data.error` and throw an `AppError` containing `tokenResponse.data.error_description || tokenResponse.data.error`.
3. **Include `redirect_uri` in Exchange Payload**:
    - In `axios.post('https://github.com/login/oauth/access_token', ...)` include `redirect_uri: `${env.WEB_URL}/github/callback``.
4. **Safeguard Email Response**:
    - Validate `Array.isArray(emailsResponse.data)` before calling `.find()`.
5. **Enforce Database Constraint**:
    - Update [`packages/database/prisma/schema.prisma`](file:///home/chaitanya/code/december/packages/database/prisma/schema.prisma) to `githubId String? @unique` and run migrations (`bun --cwd packages/database db:migrate`).
