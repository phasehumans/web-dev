#!/usr/bin/env node
import fs from 'node:fs'

function run() {
    // Avoid noisy output in automated CI / non-interactive environments
    if (process.env.CI) return

    const BLUE = '\x1b[38;2;137;180;248m'
    const WHITE = '\x1b[38;2;244;244;245m'
    const TRUNK = '\x1b[38;2;63;63;70m'
    const RESET = '\x1b[0m'

    const message = `\n${BLUE}✱${RESET}  ${WHITE}december successfully installed${RESET}\n${TRUNK}│${RESET}\n${BLUE}✱${RESET}  run ${BLUE}december${RESET} to start your session\n\n`

    try {
        if (process.platform !== 'win32' && fs.existsSync('/dev/tty')) {
            const tty = fs.createWriteStream('/dev/tty')
            tty.write(message)
            tty.end()
            return
        }
    } catch {
        // Intentionally swallowed: fallback to stderr if /dev/tty is unavailable
    }

    try {
        process.stderr.write(message)
    } catch {
        // Intentionally swallowed: ignore write failure if streams are closed
    }
}

run()
