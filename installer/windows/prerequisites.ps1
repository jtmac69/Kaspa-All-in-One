# Kaspa AIO — Windows prerequisites installer
# Installs Docker Desktop and Node.js LTS via winget if not already present.
# Run as Administrator.

param(
    [switch]$Silent
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message)
    Write-Host "[kaspa-aio-prerequisites] $Message"
}

function Test-CommandExists {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Get-NodeMajorVersion {
    try {
        $ver = (node --version 2>$null).TrimStart('v')
        return [int]($ver -split '\.')[0]
    } catch {
        return 0
    }
}

# ─── Docker Desktop ───────────────────────────────────────────────────────────
if (-not (Test-CommandExists "docker")) {
    Write-Log "Docker not found — installing Docker Desktop..."
    $wingetArgs = @("install", "-e", "--id", "Docker.DockerDesktop")
    if ($Silent) { $wingetArgs += "--silent" }
    winget @wingetArgs
    Write-Log "Docker Desktop installed. A system restart may be required."
} else {
    Write-Log "Docker already installed: $(docker --version)"
}

# ─── Node.js 18+ ──────────────────────────────────────────────────────────────
$nodeMajor = Get-NodeMajorVersion
if ($nodeMajor -lt 18) {
    Write-Log "Node.js 18+ not found (found v$nodeMajor) — installing Node.js LTS..."
    $wingetArgs = @("install", "-e", "--id", "OpenJS.NodeJS.LTS")
    if ($Silent) { $wingetArgs += "--silent" }
    winget @wingetArgs
    # Refresh PATH so node is available in this session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Log "Node.js installed: $(node --version)"
} else {
    Write-Log "Node.js already installed: $(node --version)"
}

# ─── NSSM (for Windows service management of dashboard) ──────────────────────
if (-not (Test-CommandExists "nssm")) {
    Write-Log "NSSM not found — installing via winget..."
    winget install -e --id NSSM.NSSM --silent 2>$null
    if ($?) {
        Write-Log "NSSM installed."
    } else {
        Write-Log "NSSM installation skipped (optional — dashboard can run as a process)."
    }
}

Write-Log "Prerequisites check complete."
