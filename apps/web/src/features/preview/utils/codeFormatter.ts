import parserBabel from 'prettier/plugins/babel'
import parserEstree from 'prettier/plugins/estree'
import parserHtml from 'prettier/plugins/html'
import parserPostcss from 'prettier/plugins/postcss'
import prettier from 'prettier/standalone'

import type { CodeFileLanguage } from '@/features/preview/types'

export const formatCode = async (code: string, language: CodeFileLanguage): Promise<string> => {
    if (!code || !code.trim()) {
        return code
    }

    try {
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
