#ifndef DECEMBER_MYERS_PATCH_H
#define DECEMBER_MYERS_PATCH_H

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Applies a unified diff patch to original_content with fuzzy context matching.
 * 
 * @param original_content The target text to patch.
 * @param unified_diff The unified diff string.
 * @param fuzz_factor Matching tolerance (0.0 to 1.0). Default suggestion: 0.75.
 * @return Dynamically allocated C-string containing updated content, or nullptr on failure.
 *         Caller MUST free the returned string using free_string().
 */
char* patch_fuzzy(const char* original_content, const char* unified_diff, float fuzz_factor);

/**
 * Frees a C-string allocated by the native library.
 */
void free_string(char* ptr);

#ifdef __cplusplus
}
#endif

#endif // DECEMBER_MYERS_PATCH_H
