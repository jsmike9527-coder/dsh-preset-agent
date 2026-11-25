# Runs the two fidelity tests that need DeepSeek Harness' own Electron runtime,
# because they import real packages straight out of app.asar (plain node cannot
# read inside an asar archive).
[CmdletBinding()]
param(
  [string]$Install = 'C:\Users\dhm\AppData\Local\Programs\DeepSeek Harness'
)

$ErrorActionPreference = 'Stop'
$exe = Join-Path $Install 'DeepSeek Harness.exe'
if (-not (Test-Path $exe)) { throw "DeepSeek Harness.exe not found under: $Install" }

$env:ELECTRON_RUN_AS_NODE = '1'
$env:DSH_ASAR_MODULES = Join-Path $Install 'resources\app.asar\dsh\node_modules'

$root = Split-Path $PSScriptRoot -Parent
Push-Location $root
try {
  & $exe 'test\toolschema.test.mjs'
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'toolschema.test.mjs failed' }
  & $exe 'test\cordis-e2e.mjs'
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'cordis-e2e.mjs failed' }
}
finally {
  Pop-Location
}
Write-Output 'real-runtime tests passed'
