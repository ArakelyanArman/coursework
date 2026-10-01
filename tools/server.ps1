# Static file server for Windows. Uses only what ships with Windows; nothing to install.
param(
  [int]$Port = $(if ($env:PORT) { [int]$env:PORT } else { 3000 }),
  [switch]$NoBrowser
)

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\')

$types = @{
  '.html'  = 'text/html; charset=utf-8'
  '.css'   = 'text/css; charset=utf-8'
  '.js'    = 'text/javascript; charset=utf-8'
  '.json'  = 'application/json; charset=utf-8'
  '.svg'   = 'image/svg+xml'
  '.woff2' = 'font/woff2'
  '.png'   = 'image/png'
  '.jpg'   = 'image/jpeg'
  '.ico'   = 'image/x-icon'
  '.txt'   = 'text/plain; charset=utf-8'
}

# If the port is taken by another program, the next free one is used instead.
$listener = $null
$wanted = $Port
for ($try = 0; $try -lt 20 -and -not $listener; $try++) {
  $candidate = New-Object System.Net.HttpListener
  $candidate.Prefixes.Add("http://localhost:$Port/")
  try {
    $candidate.Start()
    $listener = $candidate
  } catch {
    $candidate.Close()
    $Port++
  }
}
if (-not $listener) {
  Write-Host "Could not find a free port between $wanted and $($Port - 1)."
  exit 1
}
if ($Port -ne $wanted) { Write-Host "  Port $wanted is busy, using $Port instead." }

$startPage = ''
if (-not (Test-Path (Join-Path $root 'index.html'))) { $startPage = 'design.html' }
$url = "http://localhost:$Port/$startPage"

Write-Host ''
Write-Host "  Library is running at $url"
Write-Host '  Keep this window open. Press Ctrl+C to stop.'
Write-Host ''
if (-not $NoBrowser) { Start-Process $url }

function Send-File($response, $file, $status) {
  $bytes = [System.IO.File]::ReadAllBytes($file)
  $extension = [System.IO.Path]::GetExtension($file).ToLower()
  $contentType = $types[$extension]
  if (-not $contentType) { $contentType = 'application/octet-stream' }
  $response.StatusCode = $status
  $response.ContentType = $contentType
  $response.Headers['Cache-Control'] = 'no-cache'
  $response.ContentLength64 = $bytes.Length
  return $bytes
}

try {
  while ($listener.IsListening) {
    # Polling keeps Ctrl+C responsive; a plain GetContext() would block it.
    $pending = $listener.GetContextAsync()
    while (-not $pending.Wait(200)) { }
    $context = $pending.Result
    $request = $context.Request
    $response = $context.Response

    try {
      $path = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
      $target = [System.IO.Path]::GetFullPath((Join-Path $root $path.TrimStart('/')))
      $inside = ($target -eq $root) -or $target.StartsWith($root + '\')

      if ($inside -and (Test-Path $target -PathType Container)) {
        if (-not $path.EndsWith('/')) {
          $response.Redirect($path + '/')
          $response.Close()
          continue
        }
        $target = Join-Path $target 'index.html'
      }

      $bytes = $null
      if ($inside -and (Test-Path $target -PathType Leaf)) {
        $bytes = Send-File $response $target 200
      } elseif (Test-Path (Join-Path $root '404.html')) {
        $bytes = Send-File $response (Join-Path $root '404.html') 404
      } else {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
        $response.StatusCode = 404
        $response.ContentType = 'text/plain; charset=utf-8'
        $response.ContentLength64 = $bytes.Length
      }

      if ($request.HttpMethod -ne 'HEAD') {
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
      $response.Close()
    } catch {
      try { $response.Abort() } catch { }
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
