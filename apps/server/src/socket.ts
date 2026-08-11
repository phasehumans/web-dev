import { createAdapter } from '@socket.io/redis-adapter'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import jwt from 'jsonwebtoken'
import { Server, Socket } from 'socket.io'

import { env } from './env'

const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
})
pubClient.on('error', (err) => {
    console.error('[Socket Redis PubClient Error]', err?.message || err)
})

const subClient = pubClient.duplicate({ enableReadyCheck: false })
subClient.on('error', (err) => {
    console.error('[Socket Redis SubClient Error]', err?.message || err)
})

// this one is specifically for subscribing to worker session events
const redisSubClient = pubClient.duplicate({ enableReadyCheck: false })
redisSubClient.on('error', (err) => {
    console.error('[Socket Redis EventSubClient Error]', err?.message || err)
})

let io: Server

export function initSocket(httpServer: any) {
    io = new Server(httpServer, {
        cors: {
            origin: env.WEB_URL,
            credentials: true,
        },
        perMessageDeflate: {
            threshold: 1024, // only compress payloads larger than 1kb
        },
        adapter: createAdapter(pubClient, subClient),
    })

    // subscribe to all session events & terminal streams from redis (worker)
    redisSubClient.psubscribe('session_events:*', 'session_terminal_data:*', (err, count) => {
        if (err) console.error('Failed to psubscribe:', err)
        else console.log(`[Socket] Subscribed to ${count} Redis pattern(s)`)
    })

    redisSubClient.on('pmessage', (pattern, channel, message) => {
        if (pattern === 'session_events:*') {
            const sessionId = channel.replace('session_events:', '')
            try {
                const event = JSON.parse(message)
                console.log(
                    `[SERVER CORE -> CLIENT] 📡 Relaying event '${event.type || 'unknown'}' to room session:${sessionId}`
                )
                io.to(`session:${sessionId}`).emit('agent_event', event)
            } catch (err) {
                console.error(`[SERVER CORE] ❌ Failed to parse Redis message on ${channel}`, err)
            }
        } else if (pattern === 'session_terminal_data:*') {
            const sessionId = channel.replace('session_terminal_data:', '')
            io.to(`session_terminal:${sessionId}`).emit('TERMINAL_DATA', message)
        }
    })

    io.use((socket, next) => {
        let token = socket.handshake.auth.token
        if (!token && socket.request.headers.cookie) {
            const cookies = socket.request.headers.cookie.split(';').reduce((acc: any, cookie) => {
                const [key, value] = cookie.trim().split('=')
                if (key) acc[key] = value
                return acc
            }, {})
            token = cookies['accessToken']
        }

        if (!token) {
            return next(new Error('Authentication error'))
        }
        try {
            const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as any
            socket.data.userId = decoded.userId
            next()
        } catch (err) {
            next(new Error('Authentication error'))
        }
    })

    io.on('connection', (socket: Socket) => {
        console.log(`[Socket] User connected: ${socket.data.userId} (socket: ${socket.id})`)

        socket.on('join_session', (sessionId: string) => {
            console.log(`[Socket] User ${socket.data.userId} joined session ${sessionId}`)
            socket.data.activeSessionId = sessionId
            socket.join(`session:${sessionId}`)
        })

        socket.on('leave_session', (sessionId: string) => {
            socket.leave(`session:${sessionId}`)
            if (socket.data.activeSessionId === sessionId) {
                delete socket.data.activeSessionId
            }
        })

        socket.on('join_session_terminal', (data: { sessionId: string } | string) => {
            const sId = typeof data === 'string' ? data : data?.sessionId
            if (sId) {
                console.log(
                    `[Socket] User ${socket.data.userId} joined terminal room for session ${sId}`
                )
                socket.join(`session_terminal:${sId}`)
            }
        })

        socket.on('leave_session_terminal', (data: { sessionId: string } | string) => {
            const sId = typeof data === 'string' ? data : data?.sessionId
            if (sId) {
                socket.leave(`session_terminal:${sId}`)
            }
        })

        socket.on('TERMINAL_INPUT', async (data: { sessionId: string; data: string }) => {
            if (data?.sessionId && data?.data) {
                await pubClient.publish(`session_terminal_input:${data.sessionId}`, data.data)
            }
        })

        socket.on('disconnect', async () => {
            console.log(`[Socket] User disconnected: ${socket.data.userId} (socket: ${socket.id})`)
            const activeSessionId = socket.data.activeSessionId
            if (activeSessionId) {
                await pubClient
                    .publish(
                        `session_events:${activeSessionId}`,
                        JSON.stringify({
                            type: 'ClientDisconnect',
                            sessionId: activeSessionId,
                            timestamp: Date.now(),
                        })
                    )
                    .catch(() => {})
            }
        })

        // custom application-level heartbeat
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() })
        })

        socket.on(
            'send_prompt',
            async (data: { sessionId: string; prompt: string; projectId: string }) => {
                try {
                    console.log(
                        `[SERVER CORE] 🚀 Prompt received for session '${data.sessionId}' (user: ${socket.data.userId || 'anonymous'}): "${data.prompt?.slice(0, 80)}..."`
                    )

                    // fetch user secrets (phase 3.6 secrets management)
                    const secrets: any[] = []
                    const decryptedSecrets = secrets.map((s: any) => ({
                        key: s.key,
                        value: s.value,
                    }))

                    // enqueue to worker
                    console.log(
                        `[SERVER CORE] 📥 Enqueuing job 'run_agent' to BullMQ queue 'agent_jobs'...`
                    )
                    const agentJobsQueue = new Queue('agent_jobs', { connection: pubClient as any })
                    const job = await agentJobsQueue.add('run_agent', {
                        sessionId: data.sessionId,
                        projectId: data.projectId,
                        userId: socket.data.userId,
                        prompt: data.prompt,
                        secrets: decryptedSecrets,
                    })

                    console.log(
                        `[SERVER CORE] ✅ Job #${job.id} enqueued successfully to Redis for session '${data.sessionId}'`
                    )
                } catch (err: any) {
                    console.error('[SERVER CORE] ❌ Failed to enqueue agent job:', err)
                    socket.emit('error', { message: 'Failed to start agent: ' + err.message })
                }
            }
        )

        socket.on('stop_session', async (data: { sessionId: string }) => {
            console.log(`[Socket] Received STOP signal for session ${data.sessionId}`)
            await pubClient.publish(
                `session_interrupts:${data.sessionId}`,
                JSON.stringify({ type: 'INTERRUPT' })
            )
        })
    })

    return io
}

export function getIO(): Server {
    if (!io) {
        throw new Error('Socket.io is not initialized')
    }
    return io
}
