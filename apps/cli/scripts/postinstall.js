#!/usr/bin/env node

// Skip in CI or monorepo development builds
if (process.env.CI || process.env.NODE_ENV === 'development') {
    process.exit(0)
}

const BLUE = '\x1b[38;2;135;178;244m'
const GREEN = '\x1b[38;2;110;231;183m'
const WHITE = '\x1b[38;2;244;244;245m'
const TRUNK = '\x1b[38;2;63;63;70m'
const RESET = '\x1b[0m'

console.log(`\n${BLUE}✱${RESET}  ${GREEN}december successfully installed${RESET}`)
console.log(`${TRUNK}│${RESET}`)
console.log(`${BLUE}✱${RESET}  run ${WHITE}december${RESET} to start your session\n`)
