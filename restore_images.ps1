Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = "c:\escola\pap\code\hexomel_vite.zip"
$destDir = "c:\escola\pap\code\hexomel_vite\frontend\public\images"

Write-Host "Opening ZIP archive..."
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
Write-Host "Searching for image entries..."
foreach ($entry in $zip.Entries) {
    # Check if entry is in the images folder (case-insensitive check)
    if ($entry.FullName.ToLower().Contains("frontend/public/images/")) {
        $parts = $entry.FullName.Split("/")
        $filename = $parts[-1]
        
        # If it's a file inside the images folder (not the folder itself, nor in subfolders other than bee)
        if ($filename -and !$entry.FullName.EndsWith("/")) {
            # Let's preserve subdirectories like 'bee' if any
            $imageFolderIndex = $entry.FullName.ToLower().IndexOf("frontend/public/images/")
            $subPath = $entry.FullName.Substring($imageFolderIndex + "frontend/public/images/".Length)
            
            $targetPath = Join-Path $destDir $subPath
            $parentDir = Split-Path $targetPath -Parent
            if (!(Test-Path $parentDir)) {
                New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
            }
            Write-Host "Extracting: $subPath -> $targetPath"
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetPath, $true)
        }
    }
}
$zip.Dispose()
Write-Host "Restoration of original images completed successfully!"
