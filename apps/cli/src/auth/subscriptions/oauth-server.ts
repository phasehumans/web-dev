import crypto from 'node:crypto'
import http from 'node:http'

import type { AddressInfo } from 'node:net'

export interface PKCEPair {
    codeVerifier: string
    codeChallenge: string
    state: string
}

export function generatePKCE(): PKCEPair {
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    const state = crypto.randomBytes(16).toString('hex')
    return { codeVerifier, codeChallenge, state }
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>December - Authentication Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0D1117;
      color: #C9D1D9;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: #161B22;
      border: 1px solid #30363D;
      border-radius: 12px;
      padding: 32px 40px;
      text-align: center;
      max-width: 420px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #238636;
      color: white;
      font-size: 24px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      color: #FFFFFF;
      margin: 0 0 8px;
    }
    p {
      color: #8B949E;
      font-size: 14px;
      margin: 0 0 20px;
      line-height: 1.5;
    }
    .hint {
      font-size: 12px;
      color: #58A6FF;
      background: rgba(56, 139, 253, 0.1);
      padding: 8px 12px;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✔</div>
    <h1>Authentication Successful</h1>
    <p>Your subscription session has been authorized.<br>You can safely close this window and return to December CLI.</p>
    <div class="hint">December Terminal Agent is ready</div>
  </div>
  <script>
    setTimeout(() => { window.close(); }, 3000);
  </script>
</body>
</html>`

export interface LocalOAuthServerOptions {
    timeoutMs?: number
    path?: string
    port?: number
    host?: string
    redirectHost?: string
    redirectUri?: string
}

export interface LocalOAuthResult {
    code?: string
    state?: string
    error?: string
    errorDescription?: string
    params: Record<string, string>
}

export async function startLocalOAuthServer(options?: LocalOAuthServerOptions): Promise<{
    port: number
    redirectUri: string
    waitForCallback: () => Promise<LocalOAuthResult>
    close: () => Promise<void>
}> {
    const callbackPath = options?.path || '/callback'
    const timeoutMs = options?.timeoutMs || 120000 // 2 minutes default

    let serverInstance: http.Server | null = null
    let serverClosed = false

    const serverPromise = new Promise<{
        port: number
        redirectUri: string
        waitForCallback: () => Promise<LocalOAuthResult>
        close: () => Promise<void>
    }>((resolveServer, rejectServer) => {
        const server = http.createServer()
        serverInstance = server

        let callbackPromiseResolve: (res: LocalOAuthResult) => void
        let callbackPromiseReject: (err: Error) => void

        const callbackPromise = new Promise<LocalOAuthResult>((resolve, reject) => {
            callbackPromiseResolve = resolve
            callbackPromiseReject = reject
        })

        const timer = setTimeout(() => {
            if (!serverClosed) {
                cleanupServer()
                callbackPromiseReject(
                    new Error('OAuth authentication timed out waiting for browser authorization.')
                )
            }
        }, timeoutMs)

        const cleanupServer = async () => {
            if (serverClosed) return
            serverClosed = true
            clearTimeout(timer)
            try {
                await new Promise<void>((r) => server.close(() => r()))
            } catch {
                // Intentionally swallowed: server already closed
            }
        }

        server.on('request', (req, res) => {
            const reqUrl = req.url || '/'
            const parsedUrl = new URL(reqUrl, 'http://127.0.0.1')

            if (parsedUrl.pathname === callbackPath) {
                const queryParams: Record<string, string> = {}
                for (const [key, value] of parsedUrl.searchParams.entries()) {
                    queryParams[key] = value
                }

                const code = queryParams.code
                const state = queryParams.state
                const error = queryParams.error
                const errorDescription =
                    queryParams.error_description || queryParams.errorDescription

                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    Connection: 'close',
                })
                res.end(SUCCESS_HTML)

                cleanupServer().finally(() => {
                    callbackPromiseResolve({
                        code,
                        state,
                        error,
                        errorDescription,
                        params: queryParams,
                    })
                })
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' })
                res.end('Not Found')
            }
        })

        server.on('error', (err) => {
            clearTimeout(timer)
            rejectServer(err)
        })

        const listenPort = options?.port !== undefined ? options.port : 0
        const listenHost = options?.host || '127.0.0.1'

        server.listen(listenPort, listenHost, () => {
            const address = server.address() as AddressInfo
            const port = address.port
            const hostForUri =
                options?.redirectHost || (listenHost === '0.0.0.0' ? 'localhost' : listenHost)
            const redirectUri =
                options?.redirectUri || `http://${hostForUri}:${port}${callbackPath}`

            resolveServer({
                port,
                redirectUri,
                waitForCallback: () => callbackPromise,
                close: cleanupServer,
            })
        })
    })

    return serverPromise
}
