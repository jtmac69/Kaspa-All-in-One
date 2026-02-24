# Kaspa AIO — Windows prerequisites installer
# Installs a Docker runtime (Rancher Desktop preferred) and Node.js 20 LTS via winget.
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

# ─── Docker runtime ───────────────────────────────────────────────────────────
# Rancher Desktop is recommended over Docker Desktop because:
#   * Free and open source — Docker Desktop requires a paid commercial license
#     for organizations with >250 employees or >$10M annual revenue.
#   * Full Docker CLI and Docker Compose support — no Kaspa AIO changes needed.
# Note: both use WSL2 on Windows, so the underlying disk file (ext4.vhdx) grows
# as images are pulled. Run `docker system prune` periodically to reclaim space
# inside the VM. To compact the VHDX itself, see: https://rancherdesktop.io/faq
if (-not (Test-CommandExists "docker")) {
    Write-Log ""
    Write-Log "No Docker runtime found. Installing Rancher Desktop (recommended)..."
    Write-Log ""
    Write-Log "Why Rancher Desktop instead of Docker Desktop?"
    Write-Log "  * Free for all users — Docker Desktop requires a commercial license for organizations."
    Write-Log "  * Full Docker CLI and Docker Compose support — no Kaspa AIO changes needed."
    Write-Log "  * See https://rancherdesktop.io for details."
    Write-Log ""

    $dockerInstalled = $false
    try {
        $wingetArgs = @("install", "-e", "--id", "SUSE.RancherDesktop")
        if ($Silent) { $wingetArgs += "--silent" }
        winget @wingetArgs
        $dockerInstalled = $true
        Write-Log "Rancher Desktop installed. Launch it from the Start Menu to start the Docker runtime,"
        Write-Log "then re-run the Kaspa AIO setup."
    } catch {
        Write-Log "Rancher Desktop installation failed. Falling back to Docker Desktop..."
        try {
            $wingetArgs = @("install", "-e", "--id", "Docker.DockerDesktop")
            if ($Silent) { $wingetArgs += "--silent" }
            winget @wingetArgs
            $dockerInstalled = $true
            Write-Log "Docker Desktop installed. A system restart may be required."
        } catch {
            Write-Log "WARNING: Could not install a Docker runtime automatically."
            Write-Log "  Install Rancher Desktop: https://rancherdesktop.io"
            Write-Log "  Or Docker Desktop:       https://www.docker.com/products/docker-desktop/"
        }
    }
} else {
    Write-Log "Docker already installed: $(docker --version)"

    # If Docker Desktop is present but Rancher Desktop is not, suggest switching.
    $dockerDesktopExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    $rancherExe       = Join-Path $env:ProgramFiles "Rancher Desktop\Rancher Desktop.exe"
    if ((Test-Path $dockerDesktopExe) -and (-not (Test-Path $rancherExe))) {
        Write-Log ""
        Write-Log "TIP: You are using Docker Desktop. Rancher Desktop is a free open-source alternative:"
        Write-Log "  * Free for all users — Docker Desktop requires a paid license for organizations."
        Write-Log "  * Full Docker CLI and Docker Compose support — no Kaspa AIO changes needed."
        Write-Log "  * Install: winget install -e --id SUSE.RancherDesktop"
        Write-Log "  * See https://rancherdesktop.io for details."
        Write-Log ""
        Write-Log "TIP: To reclaim disk space with either runtime, run: docker system prune"
        Write-Log "  This removes stopped containers, dangling images, and unused networks."
        Write-Log ""
    }
}

# ─── Node.js 20 LTS ───────────────────────────────────────────────────────────
# Node 18 is EOL (Apr 2025) — use Node 20 LTS.
$nodeMajor = Get-NodeMajorVersion
if ($nodeMajor -lt 20) {
    Write-Log "Node.js 20+ not found (found v$nodeMajor) — installing Node.js LTS..."
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
