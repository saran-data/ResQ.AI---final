$env:PATH = "C:\Program Files\nodejs\;" + $env:PATH
Set-Location "$PSScriptRoot\client"
& "C:\Program Files\nodejs\node.exe" ".\node_modules\vite\bin\vite.js" --port 3000
