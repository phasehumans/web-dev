$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Repo = "phasehumans/december"
$BinaryName = "december.exe"
$InstallDir = if ($env:DECEMBER_INSTALL_DIR) { $env:DECEMBER_INSTALL_DIR } else { "$env:LOCALAPPDATA\Programs\december" }

# #87B2F4 Brand Blue Palette
$ESC   = [char]27
$Blue  = "$ESC[38;2;135;178;244m"
$Green = "$ESC[38;2;110;231;183m"
$White = "$ESC[38;2;244;244;245m"
$Grey  = "$ESC[38;2;161;161;170m"
$Trunk = "$ESC[38;2;63;63;70m"
$Reset = "$ESC[0m"

function Log-Step($msg)  { Write-Host "$Blue✱$Reset  $White$msg$Reset" }
function Log-Tree($msg)  { Write-Host "$Trunk│$Reset  $Grey$msg$Reset" }
function Log-Space       { Write-Host "$Trunk│$Reset" }
function Log-Error($msg) { Write-Host "$Blue✱$Reset  $ESC[38;2;252;165;165m$msg$Reset" }

$Target = "x86_64-pc-windows-msvc"
$Version = if ($env:DECEMBER_VERSION) { $env:DECEMBER_VERSION } else { "latest" }

Log-Step "installing december for Windows (x64)..."

$Archive = "december-$Target.zip"
$DownloadUrl = if ($Version -eq "latest") {
    "https://github.com/$Repo/releases/latest/download/$Archive"
} else {
    "https://github.com/$Repo/releases/download/v$($Version.TrimStart('v'))/$Archive"
}

$TempDir = Join-Path $env:TEMP "december-install-$(Get-Random)"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

try {
    Log-Tree "downloading pre-compiled release binary..."
    $ZipPath = Join-Path $TempDir $Archive
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath -UseBasicParsing

    Log-Tree "extracting binary..."
    Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force

    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Move-Item -Path (Join-Path $TempDir $BinaryName) -Destination (Join-Path $InstallDir $BinaryName) -Force

    Log-Space
    Log-Step "${Green}december successfully installed$Reset to $White$InstallDir\$BinaryName$Reset"

    # Add to User PATH if missing
    $UserPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($UserPath -notlike "*$InstallDir*") {
        $NewUserPath = if ([string]::IsNullOrWhiteSpace($UserPath)) { $InstallDir } else { "$UserPath;$InstallDir" }
        [Environment]::SetEnvironmentVariable("PATH", $NewUserPath, "User")
        $env:PATH = "$env:PATH;$InstallDir"
        Log-Space
        Log-Tree "Note: added $InstallDir to User PATH."
        Log-Tree "Restart your terminal for changes to take effect."
    }

    Log-Space
    Log-Step "run ${White}december$Reset to start your session"
}
catch {
    Log-Space
    Log-Error "Failed to install december: $_"
    exit 1
}
finally {
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}
