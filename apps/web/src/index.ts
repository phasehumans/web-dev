import path from 'path'

import { serve } from 'bun'

import index from './index.html'

const isProd = process.env.NODE_ENV === 'production'
const SERVER_URL =
    process.env.SERVER_URL || (isProd ? 'https://api.trydecember.com' : 'http://localhost:4000')

const proxyBackendApi = (req: Request) => {
    const url = new URL(req.url)
    const normalizedTarget = SERVER_URL.endsWith('/') ? SERVER_URL.slice(0, -1) : SERVER_URL
    const targetUrl = `${normalizedTarget}${url.pathname}${url.search}`
    const headers = new Headers(req.headers)
    try {
        headers.set('host', new URL(normalizedTarget).host)
    } catch {
        headers.set('host', isProd ? 'api.trydecember.com' : 'localhost:4000')
    }

    const options: RequestInit & { duplex?: string } = {
        method: req.method,
        headers,
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        options.body = req.body
        options.duplex = 'half'
    }

    return fetch(targetUrl, options)
}

const server = serve({
    routes: {
        '/robots.txt': () => {
            const file = Bun.file(path.join(import.meta.dir, '../assets/robots.txt'))
            return new Response(file, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
        },
        '/sitemap.xml': () => {
            const file = Bun.file(path.join(import.meta.dir, '../assets/sitemap.xml'))
            return new Response(file, {
                headers: { 'Content-Type': 'application/xml; charset=utf-8' },
            })
        },
        '/api/v1/*': proxyBackendApi,
        '/*': index,
    },

    async fetch(req) {
        const url = new URL(req.url)
        const pathname = url.pathname

        // 1. serve test api routes
        if (pathname === '/api/hello') {
            if (req.method === 'GET') {
                return Response.json({
                    message: 'Hello, world!',
                    method: 'GET',
                })
            }
            if (req.method === 'PUT') {
                return Response.json({
                    message: 'Hello, world!',
                    method: 'PUT',
                })
            }
        }

        if (pathname.startsWith('/api/hello/')) {
            const name = pathname.slice('/api/hello/'.length)
            return Response.json({
                message: `Hello, ${name}!`,
            })
        }

        // 2. serve static files from 'assets' directory
        const assetsFilePath = path.join(import.meta.dir, '../assets', pathname)
        const file = Bun.file(assetsFilePath)
        const exists = await file.exists()
        if (exists) {
            return new Response(file)
        }

        return undefined as any
    },

    development: process.env.NODE_ENV !== 'production' && {
        // enable browser hot reloading in development
        hmr: true,

        // echo console logs from the browser to the server
        console: true,
    },
})

console.log(`Server running at ${server.url}`)
