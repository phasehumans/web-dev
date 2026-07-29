import path from 'path'

import { serve } from 'bun'

import index from './index.html'

const proxyBackendApi = (req: Request) => {
    const url = new URL(req.url)
    const targetUrl = `http://localhost:4000${url.pathname}${url.search}`
    const headers = new Headers(req.headers)
    headers.set('host', 'localhost:4000')

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
        '/api/v1/*': proxyBackendApi,
        '/api/wiki/*': proxyBackendApi,
        '/api/wiki': proxyBackendApi,
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

        // 2. serve static files from 'public' directory
        const publicFilePath = path.join(import.meta.dir, '../public', pathname)
        const file = Bun.file(publicFilePath)
        const exists = await file.exists()
        if (exists) {
            return new Response(file)
        }

        return undefined as any
    },

    development: process.env.ENV !== 'PROD' && {
        // enable browser hot reloading in development
        hmr: true,

        // echo console logs from the browser to the server
        console: true,
    },
})

console.log(`Server running at ${server.url}`)
