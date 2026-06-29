Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = "c:\escola\pap\code\hexomel_vite.zip"
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$count = 0
foreach ($entry in $zip.Entries) {
    if ($entry.FullName -like "*images/*") {
        Write-Host ($entry.FullName + " - " + $entry.Length + " bytes")
        $count++
        if ($count -gt 50) {
            Write-Host "Truncated..."
            break
        }
    }
}
$zip.Dispose()
