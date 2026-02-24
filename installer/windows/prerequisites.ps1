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
# Rancher Desktop is the first choice, Podman Desktop the second, Docker Desktop
# the last resort. Comparison:
#
#   Rancher Desktop  — free/OSS, full Docker CLI + Compose support, uses WSL2
#                      (ext4.vhdx grows as images are pulled, same as Docker Desktop)
#
#   Podman Desktop   — free/OSS, daemonless (no WSL2 VM, no growing VHDX file),
#                      best option for disk space. Docker Compose works via the
#                      Podman socket but may have edge cases on complex projects.
#
#   Docker Desktop   — commercial license required for organisations >250 employees
#                      or >$10M revenue; same WSL2 disk-growth issue as Rancher.
#
# Run `docker system prune` periodically with any runtime to reclaim space inside
# the VM (removes stopped containers, dangling images, and unused networks).
if (-not (Test-CommandExists "docker")) {
    Write-Log ""
    Write-Log "No Docker runtime found. Trying Rancher Desktop, then Podman Desktop, then Docker Desktop..."
    Write-Log ""
    Write-Log "Runtime comparison:"
    Write-Log "  Rancher Desktop  — free/OSS, full Docker Compose support, uses WSL2 (disk grows with images)"
    Write-Log "  Podman Desktop   — free/OSS, daemonless (no WSL2 VM = no growing disk file, best for space)"
    Write-Log "  Docker Desktop   — requires commercial license for larger organizations"
    Write-Log ""

    $dockerInstalled = $false

    # 1st choice: Rancher Desktop
    if (-not $dockerInstalled) {
        try {
            Write-Log "Installing Rancher Desktop..."
            $wingetArgs = @("install", "-e", "--id", "SUSE.RancherDesktop")
            if ($Silent) { $wingetArgs += "--silent" }
            winget @wingetArgs
            $dockerInstalled = $true
            Write-Log "Rancher Desktop installed. Launch it from the Start Menu to start the Docker runtime,"
            Write-Log "then re-run the Kaspa AIO setup."
        } catch {
            Write-Log "Rancher Desktop installation failed — trying Podman Desktop..."
        }
    }

    # 2nd choice: Podman Desktop
    if (-not $dockerInstalled) {
        try {
            Write-Log "Installing Podman Desktop..."
            $wingetArgs = @("install", "-e", "--id", "RedHat.Podman-Desktop")
            if ($Silent) { $wingetArgs += "--silent" }
            winget @wingetArgs
            $dockerInstalled = $true
            Write-Log "Podman Desktop installed. Launch it from the Start Menu and enable the Docker socket"
            Write-Log "compatibility layer so that Docker Compose commands work, then re-run the Kaspa AIO setup."
            Write-Log "  See: https://podman-desktop.io/docs/compose"
        } catch {
            Write-Log "Podman Desktop installation failed — falling back to Docker Desktop..."
        }
    }

    # Last resort: Docker Desktop
    if (-not $dockerInstalled) {
        try {
            Write-Log "Installing Docker Desktop..."
            $wingetArgs = @("install", "-e", "--id", "Docker.DockerDesktop")
            if ($Silent) { $wingetArgs += "--silent" }
            winget @wingetArgs
            $dockerInstalled = $true
            Write-Log "Docker Desktop installed. A system restart may be required."
        } catch {
            Write-Log "WARNING: Could not install a Docker runtime automatically."
            Write-Log "  Rancher Desktop: https://rancherdesktop.io"
            Write-Log "  Podman Desktop:  https://podman-desktop.io"
            Write-Log "  Docker Desktop:  https://www.docker.com/products/docker-desktop/"
        }
    }
} else {
    Write-Log "Docker already installed: $(docker --version)"

    # If Docker Desktop is present but neither alternative is installed, suggest both options.
    $dockerDesktopExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    $rancherExe       = Join-Path $env:ProgramFiles "Rancher Desktop\Rancher Desktop.exe"
    $podmanExe        = Join-Path $env:ProgramFiles "Podman Desktop\Podman Desktop.exe"
    if ((Test-Path $dockerDesktopExe) -and (-not (Test-Path $rancherExe)) -and (-not (Test-Path $podmanExe))) {
        Write-Log ""
        Write-Log "TIP: You are using Docker Desktop. Two free alternatives are available:"
        Write-Log ""
        Write-Log "  Rancher Desktop — free/OSS, best Docker Compose compatibility:"
        Write-Log "    winget install -e --id SUSE.RancherDesktop"
        Write-Log "    https://rancherdesktop.io"
        Write-Log ""
        Write-Log "  Podman Desktop  — free/OSS, daemonless (no growing WSL2 disk file, best for disk space):"
        Write-Log "    winget install -e --id RedHat.Podman-Desktop"
        Write-Log "    https://podman-desktop.io"
        Write-Log ""
        Write-Log "TIP: To reclaim space inside the current runtime's VM: docker system prune"
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
