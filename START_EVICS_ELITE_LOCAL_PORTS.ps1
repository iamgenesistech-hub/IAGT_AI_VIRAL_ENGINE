param(
    [string]$WorkspaceRoot = $PSScriptRoot,
    [switch]$CleanStale = $true
)

$ErrorActionPreference = 'Stop'
Set-Location $WorkspaceRoot

$candidatePorts = @(8080, 8081, 8082, 8083, 8084, 8085, 8086, 4175, 4176)

function Test-EvicsStatus {
    param([int]$Port)
    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri ("http://localhost:{0}/status" -f $Port) -TimeoutSec 2
        return $resp.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Resolve-ActivePort {
    foreach ($candidate in $candidatePorts) {
        if (Test-EvicsStatus -Port $candidate) {
            return $candidate
        }
    }
    return $null
}

function Stop-StaleEvicsProcesses {
    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in $candidatePorts })
    if (-not $listeners.Count) { return }

    $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction Stop
            if ($proc.ProcessName -eq 'node') {
                Stop-Process -Id $pid -Force -ErrorAction Stop
                Write-Host ("Stopped stale node process {0} on candidate EVICS ports." -f $pid) -ForegroundColor Yellow
            }
        } catch {
            # Best effort cleanup only.
        }
    }
}

if ($CleanStale) {
    Stop-StaleEvicsProcesses
    Start-Sleep -Milliseconds 600
}

Write-Host "Starting EVICS backend (stable port policy)..."
Start-Process -FilePath "npm" -ArgumentList "run", "start:stable" -WorkingDirectory $WorkspaceRoot

$activePort = $null
$deadline = (Get-Date).AddSeconds(40)
do {
    Start-Sleep -Milliseconds 700
    $activePort = Resolve-ActivePort
} while (-not $activePort -and (Get-Date) -lt $deadline)

if (-not $activePort) {
    Write-Host "EVICS did not become reachable on candidate ports within 40 seconds." -ForegroundColor Red
    exit 2
}

Write-Host ("EVICS is live on port {0}" -f $activePort) -ForegroundColor Green
Start-Process ("http://localhost:{0}/workspace" -f $activePort)
Start-Process ("http://localhost:{0}/affiliate-products-workspace" -f $activePort)
Start-Process ("http://localhost:{0}/affiliate" -f $activePort)
Start-Process ("http://localhost:{0}/status" -f $activePort)
