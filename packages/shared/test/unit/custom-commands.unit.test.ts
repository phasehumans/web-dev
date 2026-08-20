import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

import { loadCustomCommands, interpolateCommandPrompt } from '../../src/custom-commands'

describe('Custom Command Engine (Unit)', () => {
    let tmpDir: string

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'december-commands-test-'))
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    it('interpolates placeholders like $FILE, $PKG, $ARG, and $@', () => {
        expect(interpolateCommandPrompt('Run tests for $PKG', ['packages/agent'])).toBe(
            'Run tests for packages/agent'
        )

        expect(interpolateCommandPrompt('Fix lint in $FILE', ['src/index.ts'])).toBe(
            'Fix lint in src/index.ts'
        )

        expect(interpolateCommandPrompt('Process $1 and $2', ['first', 'second'])).toBe(
            'Process first and second'
        )

        expect(interpolateCommandPrompt('Deploy with args: $@', ['--dry-run', '--verbose'])).toBe(
            'Deploy with args: --dry-run --verbose'
        )
    })

    it('appends arguments if template has no placeholders', () => {
        expect(
            interpolateCommandPrompt('Run all tests and report results', ['packages/agent'])
        ).toBe('Run all tests and report results packages/agent')
    })

    it('loads and merges workspace commands overriding global commands', () => {
        const decDir = path.join(tmpDir, '.december')
        fs.mkdirSync(decDir, { recursive: true })
        fs.writeFileSync(
            path.join(decDir, 'commands.json'),
            JSON.stringify({
                commands: [
                    {
                        name: 'test',
                        description: 'Run project tests',
                        prompt: 'Run bun test $PKG',
                    },
                ],
            })
        )

        const commands = loadCustomCommands(tmpDir)
        const testCmd = commands.find((c) => c.name === 'test')
        expect(testCmd).toBeDefined()
        expect(testCmd?.prompt).toBe('Run bun test $PKG')
    })

    it('handles commented JSON templates without applying commented commands', () => {
        const decDir = path.join(tmpDir, '.december')
        fs.mkdirSync(decDir, { recursive: true })
        fs.writeFileSync(
            path.join(decDir, 'commands.json'),
            `{
  "commands": [
    // Define custom slash commands here.
    // {
    //   "name": "test",
    //   "description": "Run tests and fix failures",
    //   "prompt": "Run 'bun test $PKG'."
    // }
  ]
}`
        )

        const commands = loadCustomCommands(tmpDir)
        expect(commands).toEqual([])
    })
})
