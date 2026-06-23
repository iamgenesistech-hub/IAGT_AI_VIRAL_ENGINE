param(
    [string]$WorkspaceRoot = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'
$port = 8080

Set-Location $WorkspaceRoot

function Get-ListeningProcessOnPort {
    param([int]$Port)

    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if (-not $connection) {
        return $null
    }

    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($connection.OwningProcess)" |
        Select-Object -First 1

    [pscustomobject]@{
        Pid = $connection.OwningProcess
        CommandLine = [string]$process.CommandLine
    }
}

$listeningProcess = Get-ListeningProcessOnPort -Port $port

if ($listeningProcess) {
    if ($listeningProcess.CommandLine -match 'start:legacy|server\.js|node\s+server\.js') {
        Write-Host "Stopping legacy 8080 process $($listeningProcess.Pid)..."
        Stop-Process -Id $listeningProcess.Pid -Force
        Start-Sleep -Seconds 2
    }
    elseif ($listeningProcess.CommandLine -match 'dev:8080|next dev -p 8080|start:next:8080|next start -p 8080') {
        Write-Host "Next server is already active on 8080."
        exit 0
    }
    else {
        Write-Host "Port 8080 is already in use by a non-legacy process."
        exit 2
    }
}

Write-Host "Starting Next dev server on 8080..."
npm run dev:8080