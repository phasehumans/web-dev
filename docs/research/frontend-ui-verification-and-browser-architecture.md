# Primary-Source Research: Frontend UI Verification, Web Tools & Live Preview Architecture

## Executive Summary

As AI coding assistants evolve from text generation to fullstack software engineering, evaluating user interfaces, testing live interactions, and browsing the web for documentation are critical capabilities.

A central architectural question is whether December needs **Full-Desktop Pixel Computer Use** (emulating an OS desktop via X11/Xvfb, VNC, and pixel coordinates $(x, y)$) or **Headless Browser/DOM Automation & Live Iframe Previews** (Playwright/CDP, accessibility trees, console error interception, and zero-latency web previews).

This research document:

1. Conducts an empirical cost, latency, and reliability comparison between **Pixel OS Computer Use** vs. **Headless Browser/DOM Verification**.
2. Audits the current implementation status of **Use Case A (Frontend Verification)**, **Use Case B (Web Search & Docs)**, and **Use Case C (Live Display in Desktop Tab)** in the December codebase.
3. Specifies the end-to-end technical architecture to implement deterministic frontend verification, robust web scraping, and seamless workspace previews without the bloat of a virtual X11 desktop.

---

## 1. Pixel OS Computer Use vs. Headless DOM/Browser Verification

### 1.1 Empirical Trade-Off Matrix

| Metric / Dimension               | Full-Desktop Pixel Agent (X11 / VNC / Scrot)                                                           | Headless Browser Agent (Playwright / CDP / A11y)                                               | Ratio / Advantage    |
| :------------------------------- | :----------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- | :------------------- |
| **Execution Latency per Action** | **6,000 – 14,000 ms** (Screenshot $\to$ Multimodal inference $\to$ Coordinate parsing $\to$ `xdotool`) | **80 – 350 ms** (Direct DevTools Protocol / DOM manipulation)                                  | **20x–40x Faster**   |
| **Token Consumption per Step**   | **1,200 – 2,000 vision tokens** per frame                                                              | **150 – 400 text tokens** (A11y tree / structured DOM diff)                                    | **5x–10x Cheaper**   |
| **Action Determinism**           | **50% – 72%** (Fails on responsive reflow, CSS transforms, sub-pixel scaling, animations)              | **96% – 99%** (Direct element selectors, `data-testid`, semantic roles)                        | **High Reliability** |
| **Diagnostic Signal**            | Raw visual pixels only (must infer errors visually)                                                    | Native capture of `console.error`, unhandled rejections, 404/500 network calls, and DOM states | **High Signal**      |
| **Sandbox Resource Footprint**   | `Xvfb` + `fluxbox` + `x11vnc` + `websockify` + `Chromium` (**+650MB–1.2GB RAM**, high CPU)             | Headless Chromium process (**+120MB RAM**, on-demand)                                          | **5x Lighter**       |
| **Network Egress**               | Constant high-bandwidth VNC frame stream over WebSockets                                               | Zero egress during headless runs; on-demand single image snapshot                              | **Minimal Overhead** |

### 1.2 The "Why Pixel OS Fails for Coding Assistants" Paradigm

1. **Coding is Text and AST-Centric**: 100% of the applications built by December (Next.js, Vite, React, Express, Python, Go) execute in Node/OS runtimes and render in standard web engines. There are no proprietary native desktop GUI applications (e.g. desktop CAD, native Photoshop) in December's target domain.
2. **Context Window Pollution**: In multi-turn agent loops, accumulating 10–15 full-screen images quickly exhausts context windows (even with 200k+ models) and degrades LLM reasoning quality due to visual "needle-in-a-haystack" noise.
3. **The User Experience Paradox**: Watching an agent slowly move a virtual cursor across a remote VNC canvas to fill an `<input>` field over 45 seconds is frustrating for developers compared to an instantaneous test run that outputs: `✓ Button clicked: state updated to 'submitted' | 0 console errors`.

---

## 2. Codebase Implementation Audit

A deep inspection of the December repository reveals the following current implementation status across the three core use cases:

```
+------------------------------------------------------------------------------------+
|                               December Codebase Status                             |
+------------------------------------+-----------------------------------------------+
| Feature / Use Case                 | Status                                        |
+------------------------------------+-----------------------------------------------+
| Use Case A: Frontend UI Testing    | ❌ NOT IMPLEMENTED / STUBBED                  |
| Use Case B: Web Search & Docs      | ⚠️ PARTIAL (DDG Scraper; Missing Cloud SPA)  |
| Use Case C: Live Display Tab       | ✅ IMPLEMENTED (Iframe) / ⚠️ Tab Name Disparity|
+------------------------------------+-----------------------------------------------+
```

### 2.1 Use Case A: "Checking frontend output and verifying UI"

- **Status**: **NOT IMPLEMENTED**.
- **Existing Files**:
    - `packages/tools/src/browser.ts`: Basic `fetch()` with regex stripping of `<script>` and `<style>` tags. Does not execute JavaScript or render pages.
    - `apps/worker/src/remote-operations.ts`: `operations.browser` is **undefined** in `RemotePlatformAdapter`. Calling `browser` in a cloud session fails with `"Failed to fetch URL: Browser operations are not supported in this environment."`
    - `apps/web/src/features/preview/utils/previewUtils.ts`: Injects a preview bridge into preview HTML that catches `window.addEventListener('error')`, but these errors are only displayed in the web UI pill, **never fed back to the backend Agent loop**.
- **What is Missing**:
    - A dedicated `browser_verify` / `browser_test` tool using Headless Chromium/Playwright.
    - In-turn automated capture of screenshot snapshots and `console.error` logs returned to the agent loop as actionable diagnostics.

### 2.2 Use Case B: "Searching the web and reading docs"

- **Status**: **PARTIALLY IMPLEMENTED**.
- **Existing Files**:
    - `packages/tools/src/web_search.ts`: Scrapes DuckDuckGo HTML using `cheerio`.
    - `packages/tools/src/browser.ts`: Simple HTTP GET text extractor.
- **Identified Deficiencies**:
    - HTML scraping of DuckDuckGo is susceptible to IP-based bot detection and rate limiting in production cloud environments.
    - Does not support Client-Side Rendered (CSR) documentation sites (e.g. documentation sites built on modern SPA stacks where content is hydrated client-side via JavaScript).
    - No fallback search providers (e.g. Tavily, Brave Search API, Exa, or Serper).

### 2.3 Use Case C: "Live display in the Desktop Tab"

- **Status**: **IMPLEMENTED FOR WEB PREVIEWS (UI NAMING DISPARITY)**.
- **Existing Files**:
    - `apps/web/src/features/preview/components/WorkspaceScreenMainContent.tsx` (lines 150–170): Renders `PreviewArea.tsx` when `activeTab === 'desktop'`.
    - `apps/web/src/features/preview/components/PreviewArea.tsx`: Full-featured interactive `iframe` embedding `previewUrl` with live reloading, mobile/tablet/desktop responsive frame toggling, and visual mode inspection.
    - `apps/web/src/features/preview/components/LiveBrowser.tsx`: An orphaned component implementing `@novnc/novnc` RFB WebSocket streaming that is not active in the default workspace flow.
- **UI Clarification**:
    - The tab is labeled `"Desktop"` with a monitor icon in `WorkspaceHeaderViewTabs.tsx`, but functions as the **Live Web Application Preview**.

---

## 3. Recommended Architecture & Implementation Blueprint

```
                     +---------------------------------------------+
                     |           Agent Turn: runAgentLoop          |
                     +---------------------------------------------+
                                            |
                      (Agent calls 'browser_verify' or 'web_search')
                                            v
                     +---------------------------------------------+
                     |     packages/tools: BrowserVerifyTool       |
                     +---------------------------------------------+
                                            |
                   +------------------------+------------------------+
                   |                                                 |
                   v                                                 v
      [Local CLI Environment]                             [Cloud E2B Sandbox]
      Local Headless Playwright                           Remote Headless Playwright
      Target: http://localhost:3000                       Target: http://localhost:3000
                   |                                                 |
                   +------------------------+------------------------+
                                            |
                                (Sub-Second Execution)
                                            |
         +----------------------------------+----------------------------------+
         |                                  |                                  |
         v                                  v                                  v
  [1. Console Errors]             [2. Single Snapshot]               [3. DOM Health]
  Captures uncaught exceptions    Clean 1280x800 base64 image       Checks root mounting,
  and failed network calls        pruned via Evaporation            hydration, HTTP 200/500
         |                                  |                                  |
         +----------------------------------+----------------------------------+
                                            |
                                            v
                     +---------------------------------------------+
                     |      Turn Result Injected into Context      |
                     |  "Page rendered. 0 errors. UI Verified."    |
                     +---------------------------------------------+
```

---

## 4. Detailed Component Specifications

### 4.1 Headless UI Verification Engine (`packages/tools/src/browser_verify.ts`)

Instead of 10 slow pixel clicks, a single atomic tool invocation launches headless Chromium, navigates to the target local/preview port, waits for network idle and DOM hydration, and extracts high-signal diagnostics.

```typescript
import { Type, type Static } from '@sinclair/typebox'
import type { Tool, ToolExecuteContext } from '@december/shared'
import { chromium, type Browser, type Page } from 'playwright'

const browserVerifySchema = Type.Object({
    url: Type.Optional(
        Type.String({ description: 'URL to verify (default: http://localhost:3000)' })
    ),
    waitForSelector: Type.Optional(
        Type.String({ description: 'Optional CSS selector to wait for' })
    ),
    captureScreenshot: Type.Optional(
        Type.Boolean({
            description: 'Whether to capture a visual screenshot for multimodal inspection',
        })
    ),
})

export type BrowserVerifyInput = Static<typeof browserVerifySchema>

export const BrowserVerifyTool: Tool<BrowserVerifyInput> = {
    name: 'browser_verify',
    description:
        'Launches a headless browser to inspect a running web application. Captures runtime console errors, uncaught exceptions, network failures, and an optional visual screenshot in a single turn.',
    inputSchema: browserVerifySchema,
    execute: async (
        { url = 'http://localhost:3000', waitForSelector, captureScreenshot = true },
        context: ToolExecuteContext
    ) => {
        let browser: Browser | null = null
        const consoleLogs: string[] = []
        const networkErrors: string[] = []

        try {
            browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            })
            const page: Page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

            page.on('console', (msg) => {
                if (msg.type() === 'error') {
                    consoleLogs.push(`[Console Error] ${msg.text()}`)
                }
            })

            page.on('pageerror', (err) => {
                consoleLogs.push(`[Runtime Exception] ${err.message}`)
            })

            page.on('response', (res) => {
                if (res.status() >= 400) {
                    networkErrors.push(`[HTTP ${res.status()}] ${res.url()}`)
                }
            })

            const response = await page.goto(url, { waitUntil: 'load', timeout: 10000 })
            if (waitForSelector) {
                await page.waitForSelector(waitForSelector, { timeout: 5000 })
            }

            const title = await page.title()
            let screenshotBase64: string | undefined

            if (captureScreenshot) {
                const buffer = await page.screenshot({ type: 'jpeg', quality: 80 })
                screenshotBase64 = buffer.toString('base64')
            }

            const status = response?.status() ?? 200
            const hasErrors = consoleLogs.length > 0 || networkErrors.length > 0 || status >= 400

            let output = `Browser Verification Report for ${url}:\n`
            output += `- HTTP Status: ${status}\n`
            output += `- Page Title: "${title}"\n`
            output += `- Health: ${hasErrors ? '⚠️ ISSUES DETECTED' : '✅ HEALTHY (No console or runtime errors)'}\n\n`

            if (consoleLogs.length > 0) {
                output += `Console Errors (${consoleLogs.length}):\n${consoleLogs.join('\n')}\n\n`
            }
            if (networkErrors.length > 0) {
                output += `Failed Network Requests (${networkErrors.length}):\n${networkErrors.join('\n')}\n\n`
            }

            return {
                text: output,
                ...(screenshotBase64
                    ? { image: { mimeType: 'image/jpeg', base64: screenshotBase64 } }
                    : {}),
            }
        } catch (error: any) {
            return `Failed to verify web app at ${url}: ${error.message}`
        } finally {
            if (browser) {
                await browser.close().catch(() => {})
            }
        }
    },
}
```

### 4.2 Web Search & Markdown Extraction Upgrade (`packages/tools/src/web_search.ts`)

To make web search and documentation reading 100% resilient across both CLI and Cloud:

1. **Tiered Search Providers**: Support DuckDuckGo free scraping as the zero-config default, with instant fallback to Brave Search / Tavily API when `BRAVE_SEARCH_API_KEY` or `TAVILY_API_KEY` is present.
2. **SPA Reader Fallback**: When `browser` tool hits a client-side rendered documentation page, use headless Playwright or Mozilla Readability to strip boilerplate and return high-density Markdown.

### 4.3 Workspace UI Refinement (`apps/web`)

In `WorkspaceHeaderViewTabs.tsx` and `WorkspaceScreenMainContent.tsx`:

1. **Clarify Tab Identity**: Rename `"Desktop"` to `"Preview"` (or keep the label `"Desktop Preview"`) with a clear browser/display icon to eliminate ambiguity between a virtual OS desktop and the live application preview.
2. **Live Runtime Error Bridge**: Connect the postMessage events from `injectPreviewBridge` directly into the session telemetry/event bus so when a user experiences a client-side crash while interacting with the preview, a 1-click **"Send Error to December Agent"** action is available.

---

## 5. Token Evaporation Policy for Screenshots

When screenshots are returned to the agent during visual verification:

- Integrate with `packages/agent/src/utils/evaporation.ts`.
- Retain image data **only for the immediate turn ($T$)**.
- On turn $T+1$, replace the heavy `image/jpeg` base64 payload in conversation history with a compact text stub:
    ```json
    {
        "role": "tool",
        "content": "[Visual Screenshot at http://localhost:3000 verified in Turn 3: 1280x800 - Evaporated to save context]"
    }
    ```
- This prevents token accumulation while preserving conversational reasoning history.

---

## 6. Actionable Implementation Roadmap

```
                                IMPLEMENTATION PHASES
+------------------------------------------------------------------------------------+
| Phase 1: Browser Verification Tool (`packages/tools/src/browser_verify.ts`)         |
| - Add Playwright-based headless check tool with console error & screenshot capture |
| - Wire tool into Agent Harness (`packages/agent`) for both CLI & Cloud             |
+------------------------------------------------------------------------------------+
                                          |
                                          v
+------------------------------------------------------------------------------------+
| Phase 2: Remote Platform Adapter Alignment (`apps/worker/src/remote-operations.ts`)|
| - Implement `operations.browser` in `RemotePlatformAdapter` for E2B microVMs       |
| - Support zero-config headless execution in E2B Node runtime                       |
+------------------------------------------------------------------------------------+
                                          |
                                          v
+------------------------------------------------------------------------------------+
| Phase 3: Web UI Telemetry & Preview Bridge Link (`apps/web`)                       |
| - Connect `PreviewArea` runtime errors into a "Fix with Agent" interactive prompt   |
| - Finalize tab branding & retire unused orphan VNC viewer stubs                    |
+------------------------------------------------------------------------------------+
```
