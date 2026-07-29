import crypto from 'node:crypto'

import pino from 'pino'
import pinoHttp from 'pino-http'

import { env } from '../env'

const isDev = env.ENV === 'DEV'

export const logger = pino({
    level: isDev ? 'debug' : 'info',
    ...(isDev
        ? {
              transport: {
                  target: 'pino-pretty',
                  options: {
                      colorize: true,
                      translateTime: 'SYS:standard',
                      ignore: 'pid,hostname',
                  },
              },
          }
        : {}),
})

export const createModuleLogger = (moduleName: string) => {
    return logger.child({ module: moduleName })
}

export const httpLogger = pinoHttp({
    logger,
    genReqId: (req, res) => {
        const existingId = req.headers['x-request-id']
        const reqId =
            (Array.isArray(existingId) ? existingId[0] : existingId) || crypto.randomUUID()
        res.setHeader('x-request-id', reqId)
        return reqId
    },
    customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) {
            return 'error'
        }
        if (res.statusCode >= 400) {
            return 'warn'
        }
        return 'info'
    },
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} finished with status ${res.statusCode}`
    },
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} failed with status ${res.statusCode}: ${err.message}`
    },
})
