import { describe, expect, it } from 'bun:test'

import {
    MCP_CATALOG,
    getCatalogPreset,
    getCatalogCategories,
    instantiateCatalogPreset,
} from '../../src/mcp/catalog'

describe('MCP Catalog Presets (Unit)', () => {
    it('has standard curated presets defined with valid metadata', () => {
        expect(MCP_CATALOG.length).toBeGreaterThanOrEqual(8)

        const github = getCatalogPreset('github')
        expect(github).toBeDefined()
        expect(github?.category).toBe('Development')
        expect(github?.config.command).toBe('npx')
        expect(github?.envPrompts?.find((p) => p.key === 'GITHUB_TOKEN')).toBeDefined()

        const postgres = getCatalogPreset('postgres')
        expect(postgres).toBeDefined()
        expect(postgres?.category).toBe('Database')
        expect(postgres?.config.args).toContain('${POSTGRES_URL}')

        const sqlite = getCatalogPreset('sqlite')
        expect(sqlite).toBeDefined()
        expect(sqlite?.category).toBe('Database')
        expect(sqlite?.config.command).toBe('uvx')

        const brave = getCatalogPreset('brave-search')
        expect(brave).toBeDefined()
        expect(brave?.category).toBe('Search & Web')

        const fetch = getCatalogPreset('fetch')
        expect(fetch).toBeDefined()

        const memory = getCatalogPreset('memory')
        expect(memory).toBeDefined()

        const filesystem = getCatalogPreset('filesystem')
        expect(filesystem).toBeDefined()
    })

    it('retrieves unique catalog categories', () => {
        const categories = getCatalogCategories()
        expect(categories).toContain('Development')
        expect(categories).toContain('Database')
        expect(categories).toContain('Search & Web')
        expect(categories).toContain('Productivity')
        expect(categories).toContain('System')
    })

    it('instantiates preset with provided environment values interpolated', () => {
        const postgres = getCatalogPreset('postgres')!
        const instantiated = instantiateCatalogPreset(postgres, {
            POSTGRES_URL: 'postgresql://postgres:pass@localhost:5432/mydb',
        })

        expect(instantiated.command).toBe('npx')
        expect(instantiated.catalogId).toBe('postgres')
        expect(instantiated.args).toContain('postgresql://postgres:pass@localhost:5432/mydb')
        expect(instantiated.autoApprove).toEqual(['describe_table', 'list_tables'])
    })

    it('instantiates preset with environment variables map updated', () => {
        const github = getCatalogPreset('github')!
        const instantiated = instantiateCatalogPreset(github, {
            GITHUB_TOKEN: 'ghp_test_token_123',
        })

        expect(instantiated.env?.GITHUB_TOKEN).toBe('ghp_test_token_123')
        expect(instantiated.catalogId).toBe('github')
    })
})
