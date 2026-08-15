export function getToolSummary(name: string, inputStrOrObj: any): string {
    let args: any = {}
    if (typeof inputStrOrObj === 'string') {
        try {
            args = JSON.parse(inputStrOrObj || '{}')
        } catch {
            args = {}
        }
    } else if (inputStrOrObj && typeof inputStrOrObj === 'object') {
        args = inputStrOrObj
    }

    const path =
        args.TargetFile ||
        args.AbsolutePath ||
        args.filePath ||
        args.filepath ||
        args.path ||
        args.file ||
        ''

    switch (name) {
        case 'read_file':
        case 'view_file':
            return `Read(${path})`.trim()
        case 'write_file':
        case 'write_to_file':
            return `Create(${path})`.trim()
        case 'edit_file':
        case 'edit_diff':
        case 'replace_file_content':
        case 'multi_replace_file_content':
            return `Edit(${path})`.trim()
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
        case 'generate_image':
            return `GenerateImage(${args.ImageName || ''})`.trim()
        case 'send_message':
            return `SendMessage(${args.Recipient || ''})`.trim()
        case 'schedule':
            return `Schedule(${args.Prompt || ''})`.trim()
        default:
            return `${name}()`
    }
}

export function getToolActionLabel(name: string): string {
    switch (name) {
        case 'read_file':
        case 'view_file':
            return 'Reading...'
        case 'write_file':
        case 'write_to_file':
            return 'Writing...'
        case 'edit_file':
        case 'edit_diff':
        case 'replace_file_content':
        case 'multi_replace_file_content':
            return 'Modifying...'
        case 'bash':
        case 'run_command':
            return 'Executing...'
        case 'find_files':
        case 'grep_search':
            return 'Searching codebase...'
        case 'search_web':
            return 'Searching web...'
        case 'list_dir':
            return 'Listing directory...'
        case 'ask_question':
            return 'Asking question...'
        case 'manage_task':
            return 'Managing tasks...'
        case 'generate_image':
            return 'Generating image...'
        case 'send_message':
            return 'Sending message...'
        case 'schedule':
            return 'Scheduling timer...'
        default:
            return 'Working...'
    }
}

export function isNoOutputTool(name: string): boolean {
    return (
        name === 'read_file' ||
        name === 'view_file' ||
        name === 'ask_permission' ||
        name === 'list_permissions'
    )
}
