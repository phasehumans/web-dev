/* eslint-disable @typescript-eslint/no-namespace */
import type { TokenPayload } from '../modules/auth/auth.types'

declare global {
    namespace Express {
        interface Request {
            user?: Pick<TokenPayload, 'userId' | 'sessionId'>
            tokenUser?: Pick<TokenPayload, 'userId' | 'sessionId'>
        }
    }
}

export {}
