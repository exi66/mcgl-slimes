$scriptDir = $PSScriptRoot

& ldc2 -mtriple=wasm32-unknown-unknown-wasm -Oz -betterC -L--allow-undefined -L--no-entry -L--strip-all "$scriptDir\wasm.d" -of="$scriptDir\wasm.wasm"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

$file = "$scriptDir\wasm.wasm"
$bytes = [System.IO.File]::ReadAllBytes($file)
$base64 = [System.Convert]::ToBase64String($bytes)

$jsCode = "const WASM_BASE64 = '$base64';`nconst WASM_BINARY = Uint8Array.from(atob(WASM_BASE64), c => c.charCodeAt(0));"

$jsCode | Set-Clipboard

Write-Host "Done! Code copied to clipboard." -ForegroundColor Green