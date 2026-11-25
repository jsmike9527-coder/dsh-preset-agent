# Refreshes the installed copy of this plugin inside a DSH profile.
#
# `pnpm install` does NOT refresh a `file:` dependency ("Already up to date"), so
# the plugin directory has to be removed first. Host-side JS is only evaluated at
# DSH startup: after this script, fully quit and reopen DeepSeek Harness.
[CmdletBinding()]
param(
  [string]$Profile = (Join-Path $env:USERPROFILE '.dsh\profiles\desktop'),
  [string]$Install = 'C:\Users\dhm\AppData\Local\Programs\DeepSeek Harness'
)

$ErrorActionPreference = 'Stop'
$runtime = Join-Path $Install 'resources\runtime\primary-runtime\dependencies'
$node = Join-Path $runtime 'node\bin\node.exe'
$pnpm = Join-Path $runtime 'pnpm\bin\pnpm.cjs'
foreach ($tool in @($node, $pnpm)) {
  if (-not (Test-Path $tool)) { throw "Missing DSH bundled tool: $tool" }
}
if (-not (Test-Path (Join-Path $Profile 'package.json'))) { throw "Not a DSH profile: $Profile" }

Push-Location $Profile
try {
  Remove-Item -Recurse -Force 'node_modules\dsh-agent-identity' -ErrorAction SilentlyContinue
  & $node $pnpm install
  if ($LASTEXITCODE -ne 0) { throw 'pnpm install failed' }
}
finally {
  Pop-Location
}

$installed = Join-Path $Profile 'node_modules\dsh-agent-identity\index.js'
if (-not (Test-Path $installed)) { throw "Plugin copy missing after install: $installed" }
Write-Output "refreshed: $installed"
Write-Output 'next: fully quit DeepSeek Harness and reopen it (Ctrl+R is not enough for host-side code)'
