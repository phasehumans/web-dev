import * as path from 'path'

import * as dotenv from 'dotenv'

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env'

if (!process.env.ENV_LOADED) {
    dotenv.config({ path: path.resolve(process.cwd(), `../../${envFile}`) })
    process.env.ENV_LOADED = 'true'
}
