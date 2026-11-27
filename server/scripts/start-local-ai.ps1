$ErrorActionPreference = 'Stop'
$runtimeDir = Join-Path $env:LOCALAPPDATA 'OverviewTeamsAI'
$executable = Join-Path $runtimeDir 'b12793\llama-server.exe'
$modelPath = Join-Path $runtimeDir 'qwen.gguf'
if (!(Test-Path $executable) -or !(Test-Path $modelPath)) {
  throw "The local model and llama.cpp runtime must be installed in $runtimeDir."
}
$listener = Get-NetTCPConnection -LocalPort 11435 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  if ((Get-Process -Id $listener[0].OwningProcess).Path -eq $executable) { return }
  throw 'Another process is using port 11435.'
}
Start-Process -FilePath $executable -WorkingDirectory $runtimeDir -WindowStyle Hidden -ArgumentList @(
  '-m', 'qwen.gguf', '--alias', 'overview-qwen', '--host', '127.0.0.1', '--port', '11435',
  '-c', '32768', '-np', '1'
) -RedirectStandardError (Join-Path $runtimeDir 'model.log') -RedirectStandardOutput (Join-Path $runtimeDir 'model.out')
