import { describe, expect, it } from 'bun:test'

import { applyFuzzyPatchTS } from '../../src/fuzzy_patch'

describe('Pure TypeScript Fuzzy Patch Engine (Unit)', () => {
    it('returns null if original content or diff is empty', () => {
        expect(applyFuzzyPatchTS('', 'diff')).toBeNull()
        expect(applyFuzzyPatchTS('content', '')).toBeNull()
        expect(applyFuzzyPatchTS('', '')).toBeNull()
    })

    it('applies an exact match unified diff hunk successfully', () => {
        const original = `line 1
line 2
line 3
line 4`

        const diff = `--- a/file.txt
+++ b/file.txt
@@ -2,2 +2,3 @@
 line 2
-line 3
+line 3 modified
+line 3.5 added
 line 4`

        const patched = applyFuzzyPatchTS(original, diff)
        expect(patched).toBe(`line 1
line 2
line 3 modified
line 3.5 added
line 4`)
    })

    it('applies patch with line offset when lines have moved up or down', () => {
        const original = `header
line 0
line 1
line 2
line 3
line 4`

        // Diff expects hunk at line 1, but in original it is at line 3
        const diff = `@@ -1,3 +1,3 @@
 line 1
-line 2
+line 2 replaced
 line 3`

        const patched = applyFuzzyPatchTS(original, diff)
        expect(patched).toContain('line 2 replaced')
        expect(patched).toContain('header')
        expect(patched).toContain('line 0')
    })

    it('tolerates trailing whitespace differences in context lines', () => {
        const original = `line A  \nline B\t\nline C`
        const diff = `@@ -1,3 +1,3 @@
 line A
-line B
+line B new
 line C`

        const patched = applyFuzzyPatchTS(original, diff)
        expect(patched).toBe(`line A\nline B new\nline C`)
    })

    it('returns null when diff does not match any hunk context in the file', () => {
        const original = `alpha\nbeta\ngamma`
        const diff = `@@ -1,3 +1,3 @@
 completely
-unrelated
+content
 lines`

        const patched = applyFuzzyPatchTS(original, diff)
        expect(patched).toBeNull()
    })
})
