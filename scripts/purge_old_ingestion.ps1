$f = "src\pages\TranslatePage.tsx"
$lines = Get-Content $f
# Lines 889-1060 (0-indexed: 888-1059) are the old AdminIngestion body — delete them
$keep = $lines[0..887] + $lines[1059..($lines.Length - 1)]
$keep | Set-Content $f -Encoding UTF8
Write-Host "Done. New line count: $($keep.Length)"
