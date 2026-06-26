$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$logDir = Join-Path $projectRoot 'logs'
$stdoutLog = Join-Path $logDir 'autostart.out.log'
$stderrLog = Join-Path $logDir 'autostart.err.log'
$startupLog = Join-Path $logDir 'autostart.startup.log'

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Location $projectRoot

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
  $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
}

if (-not $npmCommand) {
  Add-Content -Path $startupLog -Value "[$(Get-Date -Format o)] npm was not found in PATH."
  exit 1
}

Add-Content -Path $startupLog -Value "[$(Get-Date -Format o)] Starting npm start in $projectRoot."

& $npmCommand.Source start 1>> $stdoutLog 2>> $stderrLog

$exitCode = $LASTEXITCODE
Add-Content -Path $startupLog -Value "[$(Get-Date -Format o)] npm start exited with code $exitCode."
exit $exitCode
