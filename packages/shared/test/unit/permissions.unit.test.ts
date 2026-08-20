import { describe, it, expect } from 'bun:test'

import {
    classifyOperation,
    checkPathGuard,
    isDestructiveCommand,
    isSafeCommand,
    SessionWhitelistStore,
} from '../../src/permissions'

describe('Permission & Security Matrix (Unit)', () => {
    describe('PathGuard checks', () => {
        it('blocks system root paths unconditionally', () => {
            expect(checkPathGuard('/etc/passwd').isSystemBlocked).toBe(true)
            expect(checkPathGuard('/etc/shadow').isSystemBlocked).toBe(true)
            expect(checkPathGuard('/root/.ssh/id_rsa').isSystemBlocked).toBe(true)
            expect(checkPathGuard('/var/log/syslog').isSystemBlocked).toBe(true)
            expect(checkPathGuard('/bin/sh').isSystemBlocked).toBe(true)
        })

        it('blocks SSH keys and certificates unconditionally', () => {
            expect(checkPathGuard('~/.ssh/id_rsa').isSystemBlocked).toBe(true)
            expect(checkPathGuard('cert.pem').isSystemBlocked).toBe(true)
            expect(checkPathGuard('server.key').isSystemBlocked).toBe(true)
            expect(checkPathGuard('id_ed25519').isSystemBlocked).toBe(true)
        })

        it('identifies workspace secret files for high-priority confirmation', () => {
            expect(checkPathGuard('.env').isSecretAccess).toBe(true)
            expect(checkPathGuard('.env.local').isSecretAccess).toBe(true)
            expect(checkPathGuard('app.secret').isSecretAccess).toBe(true)
            expect(checkPathGuard('credentials.json').isSecretAccess).toBe(true)
            expect(checkPathGuard('src/app.ts').isSecretAccess).toBe(false)
        })
    })

    describe('Command and Tool Classification', () => {
        it('classifies read-only tools as safe', () => {
            expect(
                classifyOperation({ name: 'read_file', input: { path: 'src/index.ts' } }).tier
            ).toBe('safe')
            expect(classifyOperation({ name: 'find_files', input: { pattern: '*.ts' } }).tier).toBe(
                'safe'
            )
            expect(classifyOperation({ name: 'grep_search', input: { query: 'test' } }).tier).toBe(
                'safe'
            )
            expect(classifyOperation({ name: 'list_dir', input: { dirPath: '.' } }).tier).toBe(
                'safe'
            )
        })

        it('classifies read-only inspection shell commands as safe', () => {
            expect(isSafeCommand('git status')).toBe(true)
            expect(isSafeCommand('git diff')).toBe(true)
            expect(isSafeCommand('ls -la')).toBe(true)
            expect(
                classifyOperation({ name: 'run_command', input: { CommandLine: 'git status' } })
                    .tier
            ).toBe('safe')
            expect(
                classifyOperation({ name: 'run_command', input: { CommandLine: 'git diff' } }).tier
            ).toBe('safe')
            expect(
                classifyOperation({ name: 'run_command', input: { CommandLine: 'git log -n 5' } })
                    .tier
            ).toBe('safe')
            expect(
                classifyOperation({ name: 'run_command', input: { CommandLine: 'ls -la' } }).tier
            ).toBe('safe')
            expect(
                classifyOperation({
                    name: 'run_command',
                    input: { CommandLine: 'grep -r "test" .' },
                }).tier
            ).toBe('safe')
        })

        it('classifies dangerous shell commands as destructive', () => {
            expect(isDestructiveCommand('rm -rf /tmp/foo')).toBe(true)
            expect(isDestructiveCommand('git reset --hard HEAD~1')).toBe(true)
            expect(
                classifyOperation({
                    name: 'run_command',
                    input: { CommandLine: 'rm -rf /tmp/foo' },
                }).tier
            ).toBe('destructive')
            expect(
                classifyOperation({
                    name: 'run_command',
                    input: { CommandLine: 'git reset --hard HEAD~1' },
                }).tier
            ).toBe('destructive')
            expect(
                classifyOperation({
                    name: 'run_command',
                    input: { CommandLine: 'git push --force origin main' },
                }).tier
            ).toBe('destructive')
            expect(
                classifyOperation({ name: 'run_command', input: { CommandLine: 'git clean -fd' } })
                    .tier
            ).toBe('destructive')
        })

        it('classifies modifying commands and file operations as modifying', () => {
            expect(
                classifyOperation({ name: 'write_to_file', input: { TargetFile: 'src/test.ts' } })
                    .tier
            ).toBe('modifying')
            expect(
                classifyOperation({
                    name: 'replace_file_content',
                    input: { TargetFile: 'src/test.ts' },
                }).tier
            ).toBe('modifying')
            expect(
                classifyOperation({ name: 'run_command', input: { CommandLine: 'bun test' } }).tier
            ).toBe('modifying')
            expect(
                classifyOperation({ name: 'run_command', input: { CommandLine: 'git add .' } }).tier
            ).toBe('modifying')
        })
    })

    describe('SessionWhitelistStore', () => {
        it('supports exact and wildcard pattern matching', () => {
            const store = new SessionWhitelistStore(['bun test*'])
            expect(store.isApproved('bun test')).toBe(true)
            expect(store.isApproved('bun test packages/agent')).toBe(true)
            expect(store.isApproved('npm start')).toBe(false)
        })

        it('strictly refuses to whitelist destructive commands', () => {
            const store = new SessionWhitelistStore()
            store.add('rm -rf *')
            store.add('git reset --hard')
            expect(store.isApproved('rm -rf *')).toBe(false)
            expect(store.isApproved('git reset --hard')).toBe(false)
        })
    })
})
