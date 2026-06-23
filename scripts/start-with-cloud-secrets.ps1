param(
  [string]$ProjectId = "evics-api",
  [string]$HeygenKeySecret = "HEYGEN_API_KEY",
  [string]$AvatarSecret = "Avatar-Identity-ID",
  [string]$VoiceSecret = "Voice-ID",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Get-SecretValue {
  param(
    [string]$Name,
    [string]$Project
  )

  $value = gcloud secrets versions access latest --secret=$Name --project=$Project
  if (-not $value) {
    throw "Secret '$Name' returned an empty value."
  }
  return $value.Trim()
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$env:HEYGEN_API_KEY = Get-SecretValue -Name $HeygenKeySecret -Project $ProjectId
$env:HEYGEN_AVATAR_ID = Get-SecretValue -Name $AvatarSecret -Project $ProjectId
$env:HEYGEN_VOICE_ID = Get-SecretValue -Name $VoiceSecret -Project $ProjectId

Write-Host "Loaded cloud secrets into runtime environment." -ForegroundColor Green
Write-Host "HEYGEN_API_KEY length: $($env:HEYGEN_API_KEY.Length)"
Write-Host "HEYGEN_AVATAR_ID length: $($env:HEYGEN_AVATAR_ID.Length)"
Write-Host "HEYGEN_VOICE_ID length: $($env:HEYGEN_VOICE_ID.Length)"

if ($DryRun) {
  Write-Host "DryRun enabled. Server start skipped." -ForegroundColor Yellow
  exit 0
}

node .\server.js