# AUTO RENDER QUEUE (Roblox Shorts Kit) - leave this window open (or start it with Windows).
# Claude drops "job" files into RobloxAnim\queue. This runs them one at a time,
# and never starts while the PC is already rendering something else.
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$q = Join-Path $root 'queue'
$B = ''; $bp = Join-Path $root 'blender_path.txt'
if (Test-Path $bp) { $B = (Get-Content $bp -Raw).Trim() }
if (-not $B -or -not (Test-Path $B)) { $f = Get-ChildItem "C:\Program Files\Blender Foundation","$env:USERPROFILE\Downloads","$env:USERPROFILE\Desktop","C:\Program Files" -Recurse -Filter blender.exe -ErrorAction SilentlyContinue | Select-Object -First 1; if ($f) { $B = $f.FullName; Set-Content $bp $B } }
if (-not $B -or -not (Test-Path $B)) { Write-Host '  Blender not found. Install Blender (blender.org) then put the full path of blender.exe in blender_path.txt' -ForegroundColor Red; Read-Host 'Press Enter to close'; exit }
Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing
$tray = New-Object System.Windows.Forms.NotifyIcon; $tray.Icon = [System.Drawing.SystemIcons]::Information; $tray.Visible = $true; $tray.Text = 'Auto Render Queue'
$topic = ''; $tp = Join-Path $root 'phone_topic.txt'; if (Test-Path $tp) { $topic = (Get-Content $tp -Raw).Trim() }
function Notify($t, $m) {
  try { $tray.BalloonTipTitle = $t; $tray.BalloonTipText = $m; $tray.ShowBalloonTip(8000) } catch {}
  if ($topic) { try { Invoke-RestMethod -Method Post -Uri ("https://ntfy.sh/" + $topic) -Body $m -Headers @{ Title = $t } -TimeoutSec 10 | Out-Null } catch {} }
}
function Fmt($s) { if ($s -lt 0) { $s = 0 }; '{0}h {1:00}m {2:00}s' -f [math]::Floor($s / 3600), [math]::Floor(($s % 3600) / 60), [math]::Floor($s % 60) }
function Busy() {
  # rendering = any background Blender (-b), or Blender busy on the CPU for 20 seconds
  $ps = Get-CimInstance Win32_Process -Filter "Name='blender.exe'" -ErrorAction SilentlyContinue
  if (-not $ps) { return '' }
  foreach ($p in $ps) { if ($p.CommandLine -match ' -b ' -or $p.CommandLine -match ' --background') { return 'a background Blender render' } }
  $cores = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
  $c1 = (Get-Process -Id ($ps | ForEach-Object { $_.ProcessId }) -ErrorAction SilentlyContinue | Measure-Object CPU -Sum).Sum
  Start-Sleep -Seconds 20
  $c2 = (Get-Process -Id ($ps | ForEach-Object { $_.ProcessId }) -ErrorAction SilentlyContinue | Measure-Object CPU -Sum).Sum
  if ((($c2 - $c1) / 20) -gt [math]::Max(1.0, $cores * .25)) { return 'Blender (busy rendering)' }
  return ''
}
function RunJob($job) {
  $J = @{}; Get-Content $job.FullName | ForEach-Object { if ($_ -match '^(\w+)\s*=\s*(.*)$') { $J[$Matches[1]] = $Matches[2].Trim() } }
  $name = $J['title']; $pf = Join-Path $root $J['progress']; $sf = Join-Path $q ($job.BaseName + '_status.txt')
  $SH = @(); if ($J['anchors'] -and (Test-Path (Join-Path $root $J['anchors']))) { try { $a = Get-Content (Join-Path $root $J['anchors']) -Raw | ConvertFrom-Json; foreach ($s in $a.shots) { $SH += ,@([int]([double]$s[1] * $a.fps) + 1, [string]$s[0]) } } catch {} }
  if (Test-Path $pf) { Remove-Item $pf -Force }
  $args_ = "-b `"$root\base_rig.blend`" -P `"$root\$($J['script'])`" -- final"
  $p = Start-Process -FilePath $B -ArgumentList $args_ -PassThru -WindowStyle Hidden -WorkingDirectory $root `
       -RedirectStandardOutput (Join-Path $root ('blender_output_' + $job.BaseName + '.txt')) -RedirectStandardError (Join-Path $root ('blender_errors_' + $job.BaseName + '.txt'))
  $t0 = Get-Date; $tf = $null; $f0 = 0; $last = -1
  Notify ('Render started: ' + $name) 'Building the scene first. Updates every 10%.'
  Clear-Host
  while (-not $p.HasExited) {
    $s = $null; if (Test-Path $pf) { try { $s = (Get-Content $pf -Raw -ErrorAction Stop).Trim() } catch {} }
    $el = ((Get-Date) - $t0).TotalSeconds; [Console]::SetCursorPosition(0, 0)
    Write-Host ('  AUTO RENDER QUEUE - ' + $name).PadRight(78) -ForegroundColor Cyan; Write-Host ''.PadRight(78)
    if ($s -and $s -match '^(\d+) (\d+)$') {
      $f = [int]$Matches[1]; $n = [int]$Matches[2]; if (-not $tf) { $tf = Get-Date; $f0 = $f }
      $pct = [math]::Floor(100 * $f / $n); $fill = [math]::Floor(50 * $f / $n); $done = $f - $f0; $spf = 0; $left = -1
      if ($done -gt 2) { $spf = ((Get-Date) - $tf).TotalSeconds / $done; $left = $spf * ($n - $f) }
      $eta = if ($left -ge 0) { Fmt $left } else { 'measuring...' }; $fin = if ($left -ge 0) { (Get-Date).AddSeconds($left).ToString('h:mm tt') } else { '...' }
      $shot = ''; foreach ($x in $SH) { if ($f -ge $x[0]) { $shot = $x[1] } }
      Write-Host ('  [' + ('#' * $fill) + ('-' * (50 - $fill)) + ']  ' + $pct + '%').PadRight(78) -ForegroundColor Green; Write-Host ''.PadRight(78)
      Write-Host ('  Frame        : ' + $f + ' / ' + $n).PadRight(78); Write-Host ('  Now rendering: shot "' + $shot + '"').PadRight(78)
      Write-Host ('  Speed        : ' + ('{0:0.0}' -f $spf) + ' s per frame').PadRight(78); Write-Host ('  Elapsed      : ' + (Fmt $el)).PadRight(78)
      Write-Host ('  Time left    : ' + $eta).PadRight(78) -ForegroundColor Yellow; Write-Host ('  Done at about: ' + $fin).PadRight(78) -ForegroundColor Yellow
      $st = [math]::Floor($pct / 10); if ($st -gt $last -and $st -ge 1 -and $st -le 9) { Notify ('Render ' + ($st * 10) + '% - ' + $name) ('Time left ' + $eta + ', done at about ' + $fin + '.') }; if ($st -gt $last) { $last = $st }
      ('{0}% frame {1}/{2} left {3} done_at {4}' -f $pct, $f, $n, $eta, $fin) | Set-Content $sf
    } else {
      Write-Host ('  Building the scene... ' + (Fmt $el)).PadRight(78) -ForegroundColor Green; for ($i = 0; $i -lt 6; $i++) { Write-Host ''.PadRight(78) }
      'building ' + (Fmt $el) | Set-Content $sf
    }
    Start-Sleep -Seconds 2
  }
  $s = ''; if (Test-Path $pf) { $s = (Get-Content $pf -Raw).Trim() }; $tot = Fmt (((Get-Date) - $t0).TotalSeconds)
  if ($s -eq 'DONE') { Notify ('Render DONE - ' + $name) ('Finished in ' + $tot + '. Claude will pick it up.'); 'DONE in ' + $tot | Set-Content $sf; Rename-Item $job.FullName ($job.Name + '.done') }
  else { Notify ('Render STOPPED - ' + $name) 'It stopped before finishing. Tell Claude.'; 'FAILED after ' + $tot | Set-Content $sf; Rename-Item $job.FullName ($job.Name + '.failed') }
}
Clear-Host; Write-Host '  AUTO RENDER QUEUE is running. Leave this window open.' -ForegroundColor Cyan
while ($true) {
  $jobs = Get-ChildItem $q -Filter *.job -ErrorAction SilentlyContinue | Sort-Object LastWriteTime
  if ($jobs) {
    $why = Busy
    if ($why) { Write-Host ("`r  Waiting: your PC is busy with " + $why + '. I will start when it is free.     ') -NoNewline -ForegroundColor Yellow; 'waiting: PC busy with ' + $why | Set-Content (Join-Path $q 'queue_status.txt'); Start-Sleep -Seconds 40; continue }
    'running ' + $jobs[0].Name | Set-Content (Join-Path $q 'queue_status.txt')
    RunJob $jobs[0]
    Clear-Host; Write-Host '  AUTO RENDER QUEUE is running. Leave this window open.' -ForegroundColor Cyan
  } else { 'idle - no jobs' | Set-Content (Join-Path $q 'queue_status.txt') }
  Start-Sleep -Seconds 30
}
