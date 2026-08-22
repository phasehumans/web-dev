#!/usr/bin/env bun
import { existsSync } from 'fs'
import { rm } from 'fs/promises'
import path from 'path'

import plugin from 'bun-plugin-tailwind'

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🏗️  Bun Build Script

Usage: bun run build.ts [options]

Common Options:
  --outdir <path>          Output directory (default: "dist")
  --minify                 Enable minification (or --minify.whitespace, --minify.syntax, etc)
  --sourcemap <type>      Sourcemap type: none|linked|inline|external
  --target <target>        Build target: browser|bun|node
  --format <format>        Output format: esm|cjs|iife
  --splitting              Enable code splitting
  --packages <type>        Package handling: bundle|external
  --public-path <path>     Public path for assets
  --env <mode>             Environment handling: inline|disable|prefix*
  --conditions <list>      Package.json export conditions (comma separated)
  --external <list>        External packages (comma separated)
  --banner <text>          Add banner text to output
  --footer <text>          Add footer text to output
  --define <obj>           Define global constants (e.g. --define.VERSION=1.0.0)
  --help, -h               Show this help message

Example:
  bun run build.ts --outdir=dist --minify --sourcemap=linked --external=react,react-dom
`)
    process.exit(0)
}

const toCamelCase = (str: string): string =>
    str.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())

const parseValue = (value: string): any => {
    if (value === 'true') return true
    if (value === 'false') return false

    if (/^\d+$/.test(value)) return parseInt(value, 10)
    if (/^\d*\.\d+$/.test(value)) return parseFloat(value)

    if (value.includes(',')) return value.split(',').map((v) => v.trim())

    return value
}

function parseArgs(): Partial<Bun.BuildConfig> {
    const config: Partial<Bun.BuildConfig> & Record<string, unknown> = {}
    const args = process.argv.slice(2)

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        if (arg === undefined) continue
        if (!arg.startsWith('--')) continue

        if (arg.startsWith('--no-')) {
            const key = toCamelCase(arg.slice(5))
            config[key] = false
            continue
        }

        if (!arg.includes('=') && (i === args.length - 1 || args[i + 1]?.startsWith('--'))) {
            const key = toCamelCase(arg.slice(2))
            config[key] = true
            continue
        }

        let key: string
        let value: string

        if (arg.includes('=')) {
            ;[key, value] = arg.slice(2).split('=', 2) as [string, string]
        } else {
            key = arg.slice(2)
            value = args[++i] ?? ''
        }

        key = toCamelCase(key)

        if (key.includes('.')) {
            const [parentKey, childKey] = key.split('.')
            if (!parentKey || !childKey) continue

            const parent = (config[parentKey] ||= {}) as Record<string, unknown>
            parent[childKey] = parseValue(value)
        } else {
            config[key] = parseValue(value)
        }
    }

    return config
}

const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
}

console.log('\n🚀 Starting build process...\n')

const cliConfig = parseArgs()
const outdir = cliConfig.outdir || path.join(process.cwd(), 'dist')

if (existsSync(outdir)) {
    console.log(`🗑️ Cleaning previous build at ${outdir}`)
    await rm(outdir, { recursive: true, force: true })
}

const start = performance.now()

const entrypoints = [...new Bun.Glob('**.html').scanSync('src')]
    .map((a) => path.resolve('src', a))
    .filter((dir) => !dir.includes('node_modules'))
console.log(
    `📄 Found ${entrypoints.length} HTML ${entrypoints.length === 1 ? 'file' : 'files'} to process\n`
)

const result = await Bun.build({
    entrypoints,
    outdir,
    publicPath: (cliConfig.publicPath as string) || '/',
    plugins: [plugin],
    minify: true,
    target: 'browser',
    sourcemap: 'linked',
    define: {
        'process.env.ENV': JSON.stringify(process.env.ENV || 'PROD'),
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
        'process.env.WEB_URL': JSON.stringify(process.env.WEB_URL || 'https://trydecember.com'),
        'process.env.SERVER_URL': JSON.stringify(
            process.env.SERVER_URL || process.env.BASE_URL || 'https://api.trydecember.com'
        ),
        'process.env.BASE_URL': JSON.stringify(
            process.env.SERVER_URL || process.env.BASE_URL || 'https://api.trydecember.com'
        ),
        'process.env.GITHUB_CLIENT_ID': JSON.stringify(
            process.env.PUBLIC_GITHUB_CLIENT_ID ||
                process.env.GITHUB_CLIENT_ID ||
                'Ov23liFGkTAwCW7E8gtk'
        ),
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(
            process.env.PUBLIC_GOOGLE_CLIENT_ID ||
                process.env.GOOGLE_CLIENT_ID ||
                '762203307362-qg77ln4ci9eldv3i0q1smv804epsbhk0.apps.googleusercontent.com'
        ),
        'process.env.VERCEL_INTEGRATION_SLUG': JSON.stringify(
            process.env.PUBLIC_VERCEL_INTEGRATION_SLUG ||
                process.env.VERCEL_INTEGRATION_SLUG ||
                'december'
        ),
        'process.env.SUPABASE_CLIENT_ID': JSON.stringify(
            process.env.PUBLIC_SUPABASE_CLIENT_ID ||
                process.env.SUPABASE_CLIENT_ID ||
                '4a0473bb-3c69-4d28-8896-d1d8b6e18347'
        ),
        'process.env.NOTION_CLIENT_ID': JSON.stringify(
            process.env.PUBLIC_NOTION_CLIENT_ID ||
                process.env.NOTION_CLIENT_ID ||
                '36ad872b-594c-8101-9e7c-00378ba2e5f6'
        ),
        'process.env.DOCS_URL': JSON.stringify(process.env.DOCS_URL || ''),
    },
    ...cliConfig,
})

const end = performance.now()

const outputTable = result.outputs.map((output) => ({
    File: path.relative(process.cwd(), output.path),
    Type: output.kind,
    Size: formatFileSize(output.size),
}))

console.table(outputTable)
const buildTime = (end - start).toFixed(2)

console.log(`\n✅ Build completed in ${buildTime}ms\n`)
