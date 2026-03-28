$chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*(-_=+)"
$secret = -join ((1..64) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
Write-Output $secret
