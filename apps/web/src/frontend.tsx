/**
 * this file is the entry point for the react app, it sets up the root
 * element and renders the app component to the dom.
 *
 * it is included in `src/index.html`.
 */

import { GoogleOAuthProvider } from '@react-oauth/google'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import App from './App'
import { CliLogin } from './features/auth/components/CliLogin'
import { DeviceActivate } from './features/auth/components/DeviceActivate'
import { GithubCallback } from './features/auth/components/GithubCallback'
import { QueryProvider } from './shared/providers/query-provider'
import { getGoogleClientId } from './shared/utils/env'

const elem = document.getElementById('root')!
const app = (
    <BrowserRouter>
        <QueryProvider>
            <GoogleOAuthProvider clientId={getGoogleClientId()}>
                <Routes>
                    <Route path="/cli/login" element={<CliLogin />} />
                    <Route path="/activate" element={<DeviceActivate />} />
                    <Route path="/github/callback" element={<GithubCallback />} />
                    <Route path="*" element={<App />} />
                </Routes>
            </GoogleOAuthProvider>
        </QueryProvider>
    </BrowserRouter>
)

if (import.meta.hot) {
    // with hot module reloading, `import.meta.hot.data` is persisted.
    const root = (import.meta.hot.data.root ??= createRoot(elem))
    root.render(app)
} else {
    // the hot module reloading api is not available in production.
    createRoot(elem).render(app)
}
