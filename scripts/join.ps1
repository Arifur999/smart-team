# Joins this PC to smart-team as an agent PC, in one go. Run it on each PC that is not the hub, from the repo folder:
#
#   powershell -ExecutionPolicy Bypass -File scripts/join.ps1 -Hub 192.168.0.238 -Token <AGENT_TOKEN from the hub's apps/hub/.env>
#
# Optional: -Name "Video PC" (how it shows on the dashboard; defaults to the computer name),
#           -Folders "D:\Videos","E:\Projects" (folders the team may work in; defaults to Documents),
#           -NoAutostart (do not start the agent at every sign-in).
# Needs Node.js 24+ and Claude Code installed and signed in on this PC.
param(
  [Parameter(Mandatory)][string]$Hub,
  [Parameter(Mandatory)][string]$Token,
  [string]$Name = $env:COMPUTERNAME,
  [string[]]$Folders = @([Environment]::GetFolderPath('MyDocuments')),
  [switch]$NoAutostart
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$agentDir = Join-Path $root 'apps\node-agent'
$hubUrl = if ($Hub -match '^https?://') { $Hub.TrimEnd('/') } else { "http://${Hub}:4000" }

function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }

Step 'Checking what this PC needs'
$nodeVersion = (node --version) -replace '^v', ''
if ([int]($nodeVersion.Split('.')[0]) -lt 24) { throw "Node.js 24 or newer is needed (found $nodeVersion). Install it from https://nodejs.org and run this again." }
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { throw 'Claude Code is not installed. Install it, sign in once by running "claude", then run this again.' }
if ($Token.Length -lt 24) { throw 'The token is too short. Copy AGENT_TOKEN exactly from apps/hub/.env on the hub PC.' }

Step "Checking the hub at $hubUrl"
try {
  Invoke-RestMethod "$hubUrl/api/devices" -TimeoutSec 8 | Out-Null
} catch {
  throw "Cannot reach the hub at $hubUrl. Is the hub PC on, smart-team running there, and this PC on the same network?"
}

Step 'Installing and building (a few minutes the first time)'
Push-Location $root
try {
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed; see the lines above.' }
  npm run build:shared
  npm run build -w '@smart-team/node-agent'
  if ($LASTEXITCODE -ne 0) { throw 'Building the agent failed; see the lines above.' }
} finally {
  Pop-Location
}

Step 'Writing the agent settings'
# .env holds the token: it never goes to git (see .gitignore).
@(
  "HUB_URL=$hubUrl",
  "AGENT_TOKEN=$Token",
  "DEVICE_NAME=$Name"
) | Set-Content -Encoding utf8 (Join-Path $agentDir '.env')

$configPath = Join-Path $agentDir 'agent.config.json'
if (Test-Path $configPath) {
  Write-Host 'agent.config.json already exists; keeping it (edit it to change folders or access).'
} else {
  $config = Get-Content (Join-Path $agentDir 'agent.config.example.json') -Raw | ConvertFrom-Json
  $config.folders = @($Folders | Where-Object { Test-Path $_ } | ForEach-Object { [ordered]@{ name = Split-Path $_ -Leaf; path = $_; tags = @('code') } })
  if ($config.folders.Count -eq 0) { throw 'None of the -Folders exist on this PC. Pass folders that do, e.g. -Folders "D:\Projects".' }
  $config | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 $configPath
  Write-Host "Shared folders: $($config.folders.path -join ', ')"
}

if ($NoAutostart) {
  Step 'Done. Start the agent with: node scripts/serve.mjs --agent-only'
  return
}

Step 'Starting the agent now and at every sign-in'
& (Join-Path $PSScriptRoot 'autostart.ps1') -AgentOnly
Start-ScheduledTask -TaskName 'smart-team'
Start-Sleep -Seconds 15
$listed = (Invoke-RestMethod "$hubUrl/api/devices" -TimeoutSec 8) | Where-Object { $_.name -eq $Name -and $_.status -eq 'ONLINE' }
if ($listed) {
  Write-Host "`n$Name is online on the dashboard." -ForegroundColor Green
} else {
  Write-Host "`n$Name is not online yet. Look at logs\agent.log in the repo folder for the reason." -ForegroundColor Yellow
}
