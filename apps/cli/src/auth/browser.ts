import http from 'node:http'

import { openUrl } from '../utils/open'

export async function loginViaBrowser(
    baseUrl: string = process.env.WEB_URL
        ? `${process.env.WEB_URL}/cli/login`
        : 'https://trydecember.com/cli/login',
    onUrlGenerated?: (url: string) => void
): Promise<{ token: string; email: string | null }> {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url || '', `http://${req.headers.host}`)

            if (url.pathname === '/callback') {
                const token = url.searchParams.get('token')
                const email = url.searchParams.get('email')

                if (token) {
                    res.writeHead(200, { 'Content-Type': 'text/html' })
                    res.end(`
                        <html>
                            <head>
                                <title>Authorized</title>
                                <style>
                                    body {
                                        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                                        display: flex;
                                        flex-direction: column;
                                        justify-content: center;
                                        align-items: center;
                                        height: 100vh;
                                        margin: 0;
                                        background-color: #141414;
                                        color: #fff;
                                        text-align: center;
                                    }
                                    .container {
                                        display: flex;
                                        flex-direction: column;
                                        align-items: center;
                                        max-width: 380px;
                                        width: 100%;
                                    }
                                    svg {
                                        width: 42px;
                                        height: 42px;
                                        margin-bottom: 24px;
                                    }
                                    h1 { 
                                        font-size: 22px; 
                                        font-weight: 400; 
                                        margin: 0 0 4px 0;
                                        letter-spacing: -0.025em;
                                    }
                                    p {
                                        font-size: 13px;
                                        color: #A3A3A3;
                                        margin: 0;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <svg viewBox="5 4 14 16" fill="none" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="12" y1="12" x2="12" y2="5.3" />
                                        <line x1="12" y1="7.5" x2="13.9" y2="6.4" />
                                        <line x1="12" y1="7.5" x2="10.1" y2="6.4" />
                                        <line x1="12" y1="12" x2="17.8" y2="8.65" />
                                        <line x1="15.9" y1="9.75" x2="17.8" y2="10.85" />
                                        <line x1="15.9" y1="9.75" x2="15.9" y2="7.55" />
                                        <line x1="12" y1="12" x2="17.8" y2="15.35" />
                                        <line x1="15.9" y1="14.25" x2="15.9" y2="16.45" />
                                        <line x1="15.9" y1="14.25" x2="17.8" y2="13.15" />
                                        <line x1="12" y1="12" x2="12" y2="18.7" />
                                        <line x1="12" y1="16.5" x2="10.1" y2="17.6" />
                                        <line x1="12" y1="16.5" x2="13.9" y2="17.6" />
                                        <line x1="12" y1="12" x2="6.2" y2="15.35" />
                                        <line x1="8.1" y1="14.25" x2="6.2" y2="13.15" />
                                        <line x1="8.1" y1="14.25" x2="8.1" y2="16.45" />
                                        <line x1="12" y1="12" x2="6.2" y2="8.65" />
                                        <line x1="8.1" y1="9.75" x2="8.1" y2="7.55" />
                                        <line x1="8.1" y1="9.75" x2="6.2" y2="10.85" />
                                    </svg>
                                    <h1>Authorized</h1>
                                    <p>You can safely close this tab and return to the terminal.</p>
                                </div>
                                <script>
                                    setTimeout(() => window.close(), 3000);
                                </script>
                            </body>
                        </html>
                    `)

                    server.close(() => {
                        resolve({ token, email })
                    })
                } else {
                    res.writeHead(400, { 'Content-Type': 'text/plain' })
                    res.end('Missing token in callback.')
                    server.close(() => {
                        reject(new Error('Missing token in callback'))
                    })
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' })
                res.end('Not found')
            }
        })

        server.listen(0, '127.0.0.1', () => {
            const address = server.address()
            if (address && typeof address === 'object') {
                const port = address.port
                const redirectUri = `http://127.0.0.1:${port}/callback`
                const loginUrl = `${baseUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`
                if (onUrlGenerated) onUrlGenerated(loginUrl)

                openUrl(loginUrl).catch((err) => {
                    server.close()
                    reject(err)
                })
            } else {
                server.close()
                reject(new Error('Failed to start local server'))
            }
        })

        // timeout after 5 minutes
        setTimeout(
            () => {
                server.close()
                reject(new Error('Login timed out'))
            },
            5 * 60 * 1000
        )
    })
}
