export function interpolateSkillPrompt(
    skillName: string,
    body: string,
    args: string[],
    skillDir?: string
): string {
    const fullArgs = args.join(' ').trim()
    const firstArg = args[0] || ''

    let result = body

    // Replace standard placeholders if present: $FILE, $PKG, $ARG, $@, $*, $1..$9
    result = result.replaceAll('$FILE', firstArg || fullArgs)
    result = result.replaceAll('$PKG', firstArg || fullArgs)
    result = result.replaceAll('$ARG', firstArg || fullArgs)
    result = result.replaceAll('$@', fullArgs)
    result = result.replaceAll('$*', fullArgs)

    for (let i = 0; i < 9; i++) {
        const placeholder = `$${i + 1}`
        if (result.includes(placeholder)) {
            result = result.replaceAll(placeholder, args[i] || '')
        }
    }

    const header = fullArgs
        ? `[Skill Invocation: /${skillName} ${fullArgs}]`
        : `[Skill Invocation: /${skillName}]`
    const dirInfo = skillDir ? ` (Skill Directory: ${skillDir})` : ''

    return `${header}${dirInfo}\n\nPlease follow the procedures from skill '${skillName}':\n\n${result.trim()}`
}
