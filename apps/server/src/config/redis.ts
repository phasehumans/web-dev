import Redis from 'ioredis'

import { env } from '../env'

let redisClient: Redis | undefined

if (env.REDIS_URL) {
    try {
        redisClient = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            lazyConnect: false,
        })

        redisClient.on('error', (err) => {
            console.error('[Redis Client Error]', err?.message || err)
        })
    } catch (err) {
        console.error('[Redis Initialization Error]', err)
    }
}

export { redisClient }
