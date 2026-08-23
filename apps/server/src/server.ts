import { createServer } from 'http'

import app from './app'
import { ensureStorageBucket } from './config/s3'
import { env } from './env'
import { initSocket } from './socket'
import './background'

const PORT = env.PORT
const NODE_ENV = env.NODE_ENV

await ensureStorageBucket()

const httpServer = createServer(app)
initSocket(httpServer)

const server = httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`server is listening on PORT ${PORT} in ${NODE_ENV} mode`)
})

const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Gracefully shutting down HTTP server...`)
    server.close(() => {
        console.log('HTTP server closed.')
        process.exit(0)
    })
    setTimeout(() => {
        console.error('Forced shutdown due to timeout.')
        process.exit(1)
    }, 10000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
