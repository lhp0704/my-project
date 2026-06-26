$ErrorActionPreference = 'Stop'

$taskName = 'TaskExecutionMonitor'
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$runnerScript = Join-Path $projectRoot 'scripts\start-autostart.ps1'
$powerShellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
if (-not (Test-Path $powerShellExe)) {
  $powerShellExe = (Get-Command powershell.exe -ErrorAction Stop).Source
}

$taskCommand = "`"$powerShellExe`" -NoProfile -ExecutionPolicy Bypass -File `"$runnerScript`""

function Install-StartupLauncher {
  $startupDir = [Environment]::GetFolderPath('Startup')
  if (-not $startupDir) {
    throw 'Could not resolve the current user Startup folder.'
  }

  New-Item -ItemType Directory -Force -Path $startupDir | Out-Null

  $launcherPath = Join-Path $startupDir "$taskName.vbs"
  $escapedPowerShellExe = $powerShellExe.Replace('"', '""')
  $escapedRunnerScript = $runnerScript.Replace('"', '""')
  $launcher = @"
Set shell = CreateObject("WScript.Shell")
shell.Run """$escapedPowerShellExe"" -NoProfile -ExecutionPolicy Bypass -File ""$escapedRunnerScript""", 0, False
"@

  Set-Content -Path $launcherPath -Value $launcher -Encoding ASCII
  Write-Output "Startup launcher installed: $launcherPath"
}

$createOutput = & schtasks.exe /Create /TN $taskName /SC ONLOGON /TR $taskCommand /F /RL LIMITED 2>&1
if ($LASTEXITCODE -eq 0) {
  $createOutput
  & schtasks.exe /Query /TN $taskName /FO LIST
  if ($LASTEXITCODE -ne 0) {
    throw "Scheduled task '$taskName' was created but could not be queried."
  }
  exit 0
}

Write-Warning "Scheduled task registration failed; falling back to the current user's Startup folder."
$createOutput | ForEach-Object { Write-Warning $_ }
Install-StartupLauncher
