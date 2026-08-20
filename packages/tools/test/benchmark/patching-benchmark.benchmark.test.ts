import { describe, expect, it } from 'bun:test'

import { applyFuzzyPatchTS } from '../../src/fuzzy_patch'

describe('Fuzzy Myers Patch Engine Benchmarks', () => {
    it('benchmarks fuzzy patch application on a 5,000-line file', () => {
        const lines = Array.from({ length: 5000 }, (_, i) => `const variable_${i} = ${i * 10};`)
        const originalContent = lines.join('\n')

        // Hunk modifying lines near the end
        const diff = `@@ -4900,5 +4900,6 @@
 const variable_4900 = 49000;
 const variable_4901 = 49010;
-const variable_4902 = 49020;
+const variable_4902 = 99999;
+const variable_4902_extra = 100000;
 const variable_4903 = 49030;
 const variable_4904 = 49040;`

        const start = performance.now()
        const result = applyFuzzyPatchTS(originalContent, diff)
        const duration = performance.now() - start

        expect(result).not.toBeNull()
        expect(result).toContain('variable_4902 = 99999;')
        expect(result).toContain('variable_4902_extra = 100000;')
        expect(duration).toBeLessThan(50) // Under 50ms
    })
})
