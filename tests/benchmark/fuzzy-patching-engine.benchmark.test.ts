import { applyFuzzyPatchTS } from '@december/tools'
import { describe, expect, it } from 'bun:test'

describe('Fuzzy Myers Patch Engine Performance Benchmarks', () => {
    it('benchmarks multi-hunk patch application on large 5,000-line source files across 200 cycles', () => {
        const lines = Array.from(
            { length: 5000 },
            (_, i) => `const variable_${i}: number = ${i} * 42;`
        )
        const originalContent = lines.join('\n')

        // Construct 3 hunks spread across beginning, middle, and end with small line shifts
        const diff = `
@@ -10,3 +10,3 @@
 const variable_9: number = 9 * 42;
-const variable_10: number = 10 * 42;
+const variable_10: number = 10 * 999;
 const variable_11: number = 11 * 42;
@@ -2500,3 +2500,3 @@
 const variable_2499: number = 2499 * 42;
-const variable_2500: number = 2500 * 42;
+const variable_2500: number = 2500 * 999;
 const variable_2501: number = 2501 * 42;
@@ -4800,3 +4800,3 @@
 const variable_4799: number = 4799 * 42;
-const variable_4800: number = 4800 * 42;
+const variable_4800: number = 4800 * 999;
 const variable_4801: number = 4801 * 42;
`.trim()

        const start = performance.now()
        for (let i = 0; i < 200; i++) {
            const patched = applyFuzzyPatchTS(originalContent, diff, 0.5)
            if (i === 0) {
                expect(patched).not.toBeNull()
                expect(patched).toContain('variable_10: number = 10 * 999;')
                expect(patched).toContain('variable_2500: number = 2500 * 999;')
                expect(patched).toContain('variable_4800: number = 4800 * 999;')
            }
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(500) // 200 applications on 5,000-line file in <500ms
    })

    it('benchmarks line drift search penalty with offset scanning across 1,000 runs', () => {
        const fileContent = Array.from(
            { length: 500 },
            (_, i) => `line_${i}: payload content ${i}`
        ).join('\n')

        // Hunk indicates line 100, but actual target is at line 140 (offset of 40 lines)
        const driftedDiff = `
@@ -100,3 +100,3 @@
 line_139: payload content 139
-line_140: payload content 140
+line_140: payload content MODIFIED
 line_141: payload content 141
`.trim()

        const start = performance.now()
        for (let i = 0; i < 1000; i++) {
            const result = applyFuzzyPatchTS(fileContent, driftedDiff, 0.5)
            if (i === 0) {
                expect(result).not.toBeNull()
                expect(result).toContain('line_140: payload content MODIFIED')
            }
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(300) // 1,000 offset searches in <300ms
    })
})
