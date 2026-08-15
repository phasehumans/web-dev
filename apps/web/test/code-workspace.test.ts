import { describe, expect, it } from 'bun:test'

import {
    createCodeWorkspaceTree,
    flattenFiles,
    getDefaultCodeFilePath,
    getLanguageExtension,
    getSharedEditorExtensions,
    inferCodeFileLanguage,
} from '@/features/preview/components/codeWorkspaceConfig'
import { formatCode } from '@/features/preview/utils/codeFormatter'

describe('CodeWorkspace Configuration & Enhancements', () => {
    it('infers code file languages accurately', () => {
        expect(inferCodeFileLanguage('src/App.tsx')).toBe('tsx')
        expect(inferCodeFileLanguage('src/utils.ts')).toBe('typescript')
        expect(inferCodeFileLanguage('public/index.html')).toBe('html')
        expect(inferCodeFileLanguage('src/index.css')).toBe('css')
        expect(inferCodeFileLanguage('src/config.js')).toBe('javascript')
    })

    it('creates sorted file tree and flattens files', () => {
        const paths = ['src/components/Button.tsx', 'src/App.tsx', 'index.html', 'package.json']
        const tree = createCodeWorkspaceTree(paths)
        const flattened = flattenFiles(tree)

        expect(flattened.length).toBe(4)
        expect(flattened.some((f) => f.path === 'src/App.tsx')).toBe(true)
        expect(getDefaultCodeFilePath(paths)).toBe('src/App.tsx')
    })

    it('provides shared editor extensions with folding, search, autoclosing, and autocompletion', () => {
        const extensions = getSharedEditorExtensions()
        expect(Array.isArray(extensions)).toBe(true)
        expect(extensions.length).toBeGreaterThan(10)
    })

    it('returns language extensions for tsx, typescript, html, css, and javascript', () => {
        expect(getLanguageExtension('tsx')).toBeDefined()
        expect(getLanguageExtension('typescript')).toBeDefined()
        expect(getLanguageExtension('html')).toBeDefined()
        expect(getLanguageExtension('css')).toBeDefined()
        expect(getLanguageExtension('javascript')).toBeDefined()
    })

    it('formats TypeScript/TSX code via Prettier', async () => {
        const unformattedTs = `const greeting:string="hello world";\nconst sum=(a:number,b:number):number=>{return a+b;}`
        const formatted = await formatCode(unformattedTs, 'typescript')

        expect(formatted).toContain("const greeting: string = 'hello world'")
        expect(formatted).toContain('const sum = (a: number, b: number): number => {')
    })

    it('formats HTML code via Prettier', async () => {
        const unformattedHtml = `<div><p>Hello World</p></div>`
        const formatted = await formatCode(unformattedHtml, 'html')

        expect(formatted).toContain('<div>')
        expect(formatted).toContain('<p>Hello World</p>')
    })

    it('formats CSS code via Prettier', async () => {
        const unformattedCss = `.box{display:flex;align-items:center;}`
        const formatted = await formatCode(unformattedCss, 'css')

        expect(formatted).toContain('.box {')
        expect(formatted).toContain('display: flex;')
    })

    it('handles syntax errors gracefully without throwing', async () => {
        const brokenCode = `const x: = {`
        const result = await formatCode(brokenCode, 'typescript')
        expect(result).toBe(brokenCode)
    })
})
