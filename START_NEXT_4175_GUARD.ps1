param(
    [string]$WorkspaceRoot = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'
$port = 4175

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
        Write-Host "Stopping legacy 4175 process $($listeningProcess.Pid)..."
        Stop-Process -Id $listeningProcess.Pid -Force
        Start-Sleep -Seconds 2
    }
    elseif ($listeningProcess.CommandLine -match 'dev:4175|next dev -p 4175|start:next:4175|next start -p 4175') {
        Write-Host "Next server is already active on 4175."
        exit 0
    }
    else {
        Write-Host "Port 4175 is already in use by a non-legacy process."
        exit 2
    }
}

Write-Host "Starting Next dev server on 4175..."
npm run dev:4175