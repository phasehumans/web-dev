import * as cp from 'child_process'
import * as os from 'os'

export function openUrl(
    url: string,
    execFn: (command: string, callback?: (error: any) => void) => void = cp.exec,
    osPlatform = () => os.platform(),
    osRelease = () => os.release()
): Promise<void> {
    if (
        execFn === cp.exec &&
        (process.env.NODE_ENV === 'test' || !!process.env.BUN_TEST || !!process.env.VITEST)
    ) {
        return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
        try {
            const platform = osPlatform()
            let command = ''

            const isWsl =
                platform === 'linux' &&
                (!!process.env.WSL_DISTRO_NAME || osRelease().toLowerCase().includes('microsoft'))

            if (platform === 'darwin') {
                command = `open "${url}"`
            } else if (platform === 'win32') {
                command = `start "" "${url}"`
            } else if (isWsl) {
                command = `powershell.exe -NoProfile -Command "Start-Process '${url}'"`
            } else {
                command = `xdg-open "${url}"`
            }

            execFn(command, (error: any) => {
                if (error) reject(error)
                else resolve()
            })
        } catch (e) {
            reject(e)
        }
    })
}
