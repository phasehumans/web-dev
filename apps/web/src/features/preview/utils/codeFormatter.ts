import type { CodeFileLanguage } from '@/features/preview/types'

let prettierModule: typeof import('prettier/standalone') | null = null
let parserBabelModule: any = null
let parserEstreeModule: any = null
let parserHtmlModule: any = null
let parserPostcssModule: any = null

const loadPrettier = async () => {
    if (!prettierModule) {
        const [p, babel, estree, html, postcss] = await Promise.all([
            import('prettier/standalone'),
            import('prettier/plugins/babel'),
            import('prettier/plugins/estree'),
            import('prettier/plugins/html'),
            import('prettier/plugins/postcss'),
        ])
        prettierModule = p.default || p
        parserBabelModule = babel.default || babel
        parserEstreeModule = estree.default || estree
        parserHtmlModule = html.default || html
        parserPostcssModule = postcss.default || postcss
    }
    return {
        prettier: prettierModule!,
        parserBabel: parserBabelModule,
        parserEstree: parserEstreeModule,
        parserHtml: parserHtmlModule,
        parserPostcss: parserPostcssModule,
    }
}

export const formatCode = async (code: string, language: CodeFileLanguage): Promise<string> => {
    if (!code || !code.trim()) {
        return code
    }

    try {
        const { prettier, parserBabel, parserEstree, parserHtml, parserPostcss } =
            await loadPrettier()

        if (language === 'typescript' || language === 'tsx') {
            return await prettier.format(code, {
                parser: 'babel-ts',
                plugins: [parserBabel, parserEstree],
                semi: false,
                singleQuote: true,
                tabWidth: 2,
                trailingComma: 'es5',
            })
        }

        if (language === 'javascript') {
            return await prettier.format(code, {
                parser: 'babel',
                plugins: [parserBabel, parserEstree],
                semi: false,
                singleQuote: true,
                tabWidth: 2,
                trailingComma: 'es5',
            })
        }

        if (language === 'html') {
            return await prettier.format(code, {
                parser: 'html',
                plugins: [parserHtml],
                tabWidth: 2,
            })
        }

        if (language === 'css') {
            return await prettier.format(code, {
                parser: 'css',
                plugins: [parserPostcss],
                tabWidth: 2,
                singleQuote: true,
            })
        }

        return code
    } catch (error) {
        // Intentionally swallowed: return unformatted code if syntax is temporarily invalid while typing
        console.warn('Prettier formatting skipped:', error)
        return code
    }
}
