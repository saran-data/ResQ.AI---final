$env:PATH = "C:\Program Files\nodejs\;" + $env:PATH
Set-Location "$PSScriptRoot\server"
& "C:\Program Files\nodejs\node.exe" server.js
