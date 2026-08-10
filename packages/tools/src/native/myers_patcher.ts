import * as fs from 'node:fs'
import * as path from 'node:path'

import { dlopen, FFIType, suffix, CString } from 'bun:ffi'

interface NativeLib {
    symbols: {
        patch_fuzzy: (
            originalContent: Buffer | Uint8Array,
            unifiedDiff: Buffer | Uint8Array,
            fuzzFactor: number
        ) => number
        free_string: (ptr: number) => void
    }
}

let nativeLibInstance: NativeLib | null = null
let attemptedLoad = false

function loadNativeLibrary(): NativeLib | null {
    if (attemptedLoad) return nativeLibInstance
    attemptedLoad = true

    const possiblePaths = [
        path.join(__dirname, '../../native', `libdecember_native.${suffix}`),
        path.join(__dirname, '../native', `libdecember_native.${suffix}`),
        path.join(process.cwd(), 'packages/tools/native', `libdecember_native.${suffix}`),
        path.join(process.cwd(), 'native', `libdecember_native.${suffix}`),
    ]

    for (const libPath of possiblePaths) {
        if (fs.existsSync(libPath)) {
            try {
                const loaded = dlopen(libPath, {
                    patch_fuzzy: {
                        args: [FFIType.ptr, FFIType.ptr, FFIType.float],
                        returns: FFIType.ptr,
                    },
                    free_string: {
                        args: [FFIType.ptr],
                        returns: FFIType.void,
                    },
                })
                nativeLibInstance = loaded as unknown as NativeLib
                return nativeLibInstance
            } catch (e) {
                // Ignore load error and continue trying next location or fallback
            }
        }
    }

    return null
}

export function patchFuzzyNative(
    originalContent: string,
    unifiedDiff: string,
    fuzzFactor: number = 0.75
): string | null {
    const lib = loadNativeLibrary()
    if (!lib) return null

    try {
        const origBuf = Buffer.from(originalContent + '\0', 'utf-8')
        const diffBuf = Buffer.from(unifiedDiff + '\0', 'utf-8')

        const resPtr = lib.symbols.patch_fuzzy(origBuf, diffBuf, fuzzFactor)
        if (!resPtr) return null

        const cstr = new CString(resPtr as any)
        const resultString = cstr.toString()
        lib.symbols.free_string(resPtr)

        return resultString
    } catch {
        return null
    }
}
