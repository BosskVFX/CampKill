$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8000/")
$listener.Start()

Write-Host "Server started at http://localhost:8000/"
Write-Host "Press Ctrl+C to stop the server..."

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") {
            $localPath = "/index.html"
        }
        
        $filePath = Join-Path $PSScriptRoot $localPath.TrimStart("/")
        
        if (Test-Path $filePath -PathType Leaf) {
            $contentType = "text/plain"
            
            if ($filePath -match "\.(html|htm)$") {
                $contentType = "text/html"
            } elseif ($filePath -match "\.(js)$") {
                $contentType = "application/javascript"
            } elseif ($filePath -match "\.(css)$") {
                $contentType = "text/css"
            } elseif ($filePath -match "\.(jpg|jpeg)$") {
                $contentType = "image/jpeg"
            } elseif ($filePath -match "\.(png)$") {
                $contentType = "image/png"
            } elseif ($filePath -match "\.(gif)$") {
                $contentType = "image/gif"
            }
            
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $response.ContentType = "text/plain"
            $content = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        }
        
        $response.Close()
        
        Write-Host "Request: $($request.Url.LocalPath) - Status: $($response.StatusCode)"
    }
} finally {
    $listener.Stop()
} 