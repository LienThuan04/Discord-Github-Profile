param(
  [Parameter(Mandatory = $true)][string]$MatrixDir,
  [string]$Browser = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
)
$ErrorActionPreference = 'Stop'
$matrixPath = (Resolve-Path -LiteralPath $MatrixDir).Path
if (-not (Test-Path -LiteralPath $Browser)) { $Browser = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }
if (-not (Test-Path -LiteralPath $Browser)) { throw 'Chrome or Edge is required for visual verification.' }
$fixtureNames = @('demo','game','spotify','streaming','watching','plain','gradient','offline')
foreach ($theme in @('profile','nitro','member','compact','activity','glass','badge')) {
  $height = 210
  foreach ($fixture in $fixtureNames) {
    $svg = Get-Content -LiteralPath (Join-Path $matrixPath "$theme-$fixture-dark.svg") -Raw
    if ($svg -notmatch '<svg[^>]+height="(\d+)"') { throw "Missing SVG dimensions: $theme/$fixture" }
    $height += [int]$Matches[1] + 68
  }
  $png = Join-Path $matrixPath "$theme-matrix.png"
  $htmlUri = ([Uri](Join-Path $matrixPath "$theme.html")).AbsoluteUri
  $browserArgs = @('--headless','--disable-gpu','--hide-scrollbars','--allow-file-access-from-files','--no-first-run','--no-default-browser-check',"--user-data-dir=$(Join-Path $matrixPath 'headless-profile')",'--force-device-scale-factor=1','--run-all-compositor-stages-before-draw','--virtual-time-budget=1500',"--window-size=1000,$height", "--screenshot=$png",$htmlUri)
  $process = Start-Process -FilePath $Browser -ArgumentList $browserArgs -WindowStyle Hidden -Wait -PassThru -RedirectStandardError (Join-Path $matrixPath "$theme-chrome.log")
  if ($process.ExitCode -ne 0) { throw "Headless browser failed for $theme with exit code $($process.ExitCode)." }
  if (-not (Test-Path -LiteralPath $png)) { throw "No screenshot produced: $png" }
  Write-Output "$theme : $png (1000 x $height)"
}
