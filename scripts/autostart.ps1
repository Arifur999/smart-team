# Starts smart-team (scripts/serve.mjs) hidden whenever you sign in to Windows, through Task Scheduler.
#   powershell -File scripts/autostart.ps1            turn it on
#   powershell -File scripts/autostart.ps1 -NoAgent   turn it on without this PC's node agent
#   powershell -File scripts/autostart.ps1 -Remove    turn it off
param([switch]$Remove, [switch]$NoAgent)

$name = 'smart-team'
if ($Remove) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
  "Autostart is off."
  return
}

$root = Split-Path $PSScriptRoot -Parent
$node = (Get-Command node -ErrorAction Stop).Source
$serveArgs = "`"$root\scripts\serve.mjs`"" + $(if ($NoAgent) { ' --no-agent' } else { '' })

# conhost --headless runs node without a console window.
$action = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument "--headless `"$node`" $serveArgs" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = 'PT20S'
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
"Autostart is on: smart-team starts 20 seconds after you sign in. Logs are in $root\logs."
