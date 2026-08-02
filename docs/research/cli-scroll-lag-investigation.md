# CLI Scroll Lag Investigation

## Executive Summary

The CLI experiences severe scrolling lag, flickering, and rendering stalls during message generation. The root cause is a fundamental anti-pattern in how the React Ink component tree handles long lists. The application constantly re-renders the _entire_ conversation history on every state update (e.g., when a streaming token arrives) rather than appending completed messages to standard output.

## Root Causes Identified

### 1. Missing `<Static>` Component for History Rendering

**File:** [`packages/tui/src/components/message-list.tsx`](file:///home/chaitanya/code/december/packages/tui/src/components/message-list.tsx#L27-L58)
**Details:**
The `MessageList` component destructively concatenates `staticMessages` and `activeMessages` into a single `allMessages` array, rendering them inside a standard `<Box flexDirection="column">`:

```tsx
const allMessages = [...staticMessages, ...activeMessages]

return (
    <Box flexDirection="column">
        {allMessages.map((msg, index) => {
            // Renders every message dynamically...
        })}
    </Box>
)
```

In Ink, standard components are cleared and redrawn via ANSI escape sequences on every state change. Because the LLM streams tokens, state changes happen dozens of times per second. Re-rendering a large array of past messages causes exponential ANSI buffer repaints, stalling the node event loop and maxing out the CPU.

**Solution:** `staticMessages` should be rendered using `import { Static } from 'ink'`. The `<Static>` component renders its children exactly once and writes them directly to standard output above the dynamic Ink layout. This completely removes past messages from the active React render cycle.

### 2. Broken Native Terminal Scrollback

**Files:** [`packages/tui/src/app.tsx`](file:///home/chaitanya/code/december/packages/tui/src/app.tsx) & [`packages/tui/src/components/message-list.tsx`](file:///home/chaitanya/code/december/packages/tui/src/components/message-list.tsx)
**Details:**
Because past messages are kept in the active `<Box>` tree, Ink forcibly clears the screen and rewrites them from the bottom up on every tick. This breaks native terminal scrollback (mouse wheel scrolling). If `<Static>` were used, standard output would flow naturally, allowing terminal emulators to manage the scrollback buffer perfectly with zero JavaScript overhead.

### 3. Abandoned `ScrollView` Implementation

**File:** [`packages/tui/src/components/scroll-view.tsx`](file:///home/chaitanya/code/december/packages/tui/src/components/scroll-view.tsx#L1-L36)
**Details:**
There was an attempt to fix viewport scrolling manually by listening to `stdout` resize events and binding `pageUp`/`pageDown` keys to adjust a `marginTop={-scrollTop}` style.
However, a search across the codebase reveals that `ScrollView` is completely dead code. It is exported in `scroll-view.tsx` but is **never imported or used** in `app.tsx`, `index.tsx`, or any other file. Even if it were implemented, artificial React-based viewport scrolling performs worse than native terminal scrollback enabled by `<Static>`.
