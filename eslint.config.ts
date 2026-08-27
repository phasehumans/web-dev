// eslint.config.ts

import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import boundaries from 'eslint-plugin-boundaries'
import importPlugin from 'eslint-plugin-import'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    /**
     * Ignore files
     */
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.next/**',
            '**/coverage/**',
            '**/out/**',
            '**/*.min.js',
            '**/runtime/**',
            '**/infra/**',
            '**/.december-imports/**',
            '**/.december/logs/**',
            '**/packages/database/src/generated/**',
            '**/generated/**',
        ],
    },

    /**
     * Base ESLint recommended
     */
    js.configs.recommended,

    /**
     * TypeScript recommended
     */
    ...tseslint.configs.recommended,

    /**
     * Main TS/React config
     */
    {
        files: ['**/*.{ts,tsx}'],

        languageOptions: {
            parser: tseslint.parser,

            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },

            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },

        plugins: {
            react,
            'react-hooks': reactHooks,
            import: importPlugin,
            'unused-imports': unusedImports,
            boundaries,
        },

        settings: {
            react: {
                version: 'detect',
            },
            'boundaries/elements': [
                { type: 'app', pattern: 'apps/*' },
                { type: 'package', pattern: 'packages/*' },
            ],
        },

        rules: {
            /**
             * Package Boundaries
             */
            'boundaries/element-types': [
                'warn',
                {
                    default: 'allow',
                    rules: [
                        {
                            from: 'package',
                            disallow: ['app'],
                            message: 'Packages must not import from apps.',
                        },
                    ],
                },
            ],

            /**
             * React
             */
            'react/react-in-jsx-scope': 'off',

            /**
             * React Hooks
             */
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            /**
             * Imports
             */
            'import/order': [
                'warn',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                        'type',
                    ],

                    'newlines-between': 'always',

                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],

            /**
             * Unused imports
             */
            'unused-imports/no-unused-imports': 'warn',

            /**
             * TypeScript & General Rules Overrides
             */
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-require-imports': 'error',
            '@typescript-eslint/ban-ts-comment': 'warn',
            '@typescript-eslint/prefer-as-const': 'warn',
            'no-empty': 'error',
            'no-case-declarations': 'error',
            'no-useless-assignment': 'warn',
            'no-useless-escape': 'warn',
            'prefer-const': 'warn',
            'require-yield': 'error',
            'no-async-promise-executor': 'warn',
            'preserve-caught-error': 'warn',
            'no-console': 'off',
        },
    },

    /**
     * JS files
     */
    {
        files: ['**/*.{js,mjs,cjs}'],

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },

    /**
     * Disable formatting conflicts
     */
    prettier
)
