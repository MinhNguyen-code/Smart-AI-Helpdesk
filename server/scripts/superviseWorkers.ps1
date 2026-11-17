param([switch]$IncludeEmail, [string]$WorkerScript = '', [int]$PollSeconds = 10)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if ($PollSeconds -lt 1) { throw 'PollSeconds must be at least 1.' }
if ($WorkerScript -and $IncludeEmail) { throw 'WorkerScript override supports one worker only.' }
$logDir = Join-Path $projectRoot 'logs\workers'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$supervisorLog = Join-Path $logDir 'supervisor.jsonl'
function Write-WorkerEvent {
  param([string]$EventName, [string]$WorkerName, [int]$ProcessId = 0)
  $entry = @{ at = (Get-Date).ToUniversalTime().ToString('o'); event = $EventName; worker = $WorkerName; pid = $ProcessId }
  $line = $entry | ConvertTo-Json -Compress
  Add-Content -LiteralPath $supervisorLog -Value $line -Encoding UTF8
  Write-Output $line
}
$mutex = [System.Threading.Mutex]::new($false, 'Local\SmartITHelpdeskWorkerSupervisor')
$owned = $false
$children = @{}
try {
  try { $owned = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $owned = $true }
  if (-not $owned) { throw 'A Smart IT Helpdesk worker supervisor is already running.' }
  $node = (Get-Command node.exe -ErrorAction Stop).Source
  $names = @('slaWorker')
  if ($IncludeEmail) { $names += 'emailWorker' }
  while ($true) {
    foreach ($name in $names) {
      if (-not $children.ContainsKey($name) -or $children[$name].HasExited) {
        if ($children.ContainsKey($name)) {
          $previous = $children[$name]
          $previous.WaitForExit()
          $previousId = [int]$previous.Id
          Write-WorkerEvent -EventName 'worker_exited' -WorkerName $name -ProcessId $previousId
          $previous.Dispose()
        }
        $file = if ($WorkerScript) { (Resolve-Path -LiteralPath $WorkerScript).Path } else { Join-Path $projectRoot "server\src\workers\$name.js" }
        $launchId = '{0}-{1}' -f (Get-Date -Format 'yyyyMMddTHHmmssfff'), ([guid]::NewGuid().ToString('N').Substring(0, 8))
        $stdout = Join-Path $logDir "$name-$launchId.stdout.log"
        $stderr = Join-Path $logDir "$name-$launchId.stderr.log"
        $children[$name] = Start-Process -FilePath $node -ArgumentList ('"' + $file + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
        Write-WorkerEvent -EventName 'worker_started' -WorkerName $name -ProcessId $children[$name].Id
      }
    }
    Start-Sleep -Seconds $PollSeconds
  }
} finally {
  foreach ($child in $children.Values) {
    if (-not $child.HasExited) { Stop-Process -Id $child.Id -ErrorAction SilentlyContinue; Write-WorkerEvent -EventName 'worker_stopped' -WorkerName 'supervisor_shutdown' -ProcessId $child.Id }
    $child.Dispose()
  }
  if ($owned) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
