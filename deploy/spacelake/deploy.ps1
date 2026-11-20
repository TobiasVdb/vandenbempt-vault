param([string]$HostAddress = '188.166.94.42', [switch]$Bootstrap)
$ErrorActionPreference = 'Stop'
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$stamp = Get-Date -Format yyyyMMdd-HHmmss
$work = Join-Path $repo 'artifacts/spacelake'
$stage = Join-Path $work $stamp
New-Item -ItemType Directory -Force -Path "$stage/site", "$stage/app" | Out-Null
Copy-Item "$repo/public/spacelake/*" "$stage/site" -Recurse
Copy-Item "$PSScriptRoot/server.mjs", "$PSScriptRoot/activity.mjs" "$stage/app"
$archive = Join-Path $work "spacelake-$stamp.tar.gz"
& tar -czf $archive -C $stage site app
if ($LASTEXITCODE -ne 0) { throw 'Website packaging failed' }
& scp -q $archive "root@${HostAddress}:/tmp/spacelake-$stamp.tar.gz"
if ($LASTEXITCODE -ne 0) { throw 'Website upload failed' }
& ssh -o BatchMode=yes "root@$HostAddress" "set -eu; install -d /opt/spacelake/releases/$stamp; tar -xzf /tmp/spacelake-$stamp.tar.gz -C /opt/spacelake/releases/$stamp; ln -sfn /opt/spacelake/releases/$stamp /opt/spacelake/current"
if ($LASTEXITCODE -ne 0) { throw 'Website installation failed' }
if ($Bootstrap) {
    & scp -q "$PSScriptRoot/bootstrap.sh" "root@${HostAddress}:/tmp/spacelake-bootstrap.sh"
    if ($LASTEXITCODE -ne 0) { throw 'Bootstrap upload failed' }
    & ssh -o BatchMode=yes "root@$HostAddress" 'bash /tmp/spacelake-bootstrap.sh'
} else {
    & ssh -o BatchMode=yes "root@$HostAddress" 'systemctl restart spacelake; systemctl is-active spacelake'
}
if ($LASTEXITCODE -ne 0) { throw 'Website activation failed; previous release remains under /opt/spacelake/releases' }
