export function getToolSummary(name: string, inputStr: string): string {
    try {
        const args = JSON.parse(inputStr || '{}')
        switch (name) {
            case 'read_file':
            case 'view_file':
                return `Read(${args.AbsolutePath || args.filePath || args.path || ''})`.trim()
            case 'write_file':
            case 'write_to_file':
                return `Create(${args.TargetFile || args.filePath || args.path || ''})`.trim()
            case 'edit_file':
            case 'edit_diff':
            case 'replace_file_content':
            case 'multi_replace_file_content':
                return `Edit(${args.TargetFile || args.filePath || args.path || ''})`.trim()
            case 'list_dir':
                return `ListDir(${args.DirectoryPath || args.dirPath || args.path || ''})`.trim()
            case 'bash':
            case 'run_command':
                return `Bash(${args.CommandLine || args.command || ''})`.trim()
            case 'find_files':
            case 'grep_search':
                return `Search(${args.Query || args.pattern || args.query || ''})`.trim()
            case 'search_web':
                return `WebSearch(${args.query || ''})`.trim()
            case 'ask_question':
                return `AskQuestion()`
            case 'manage_task':
                return `ManageTask(${args.Action || ''})`.trim()
            default:
                return `${name}()`
        }
    } catch {
        return `${name}()`
    }
}
