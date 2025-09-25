$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory=$true)][string]$ClientId,
  [Parameter(Mandatory=$true)][string]$ClientSecret,
  [Parameter(Mandatory=$true)][string]$MasterToken,
  [Parameter(Mandatory=$true)][string]$UserId
)

Write-Host "Fetching user access token..."

$headers = @{ 'x-api-key' = $ClientId; 'authorization' = $MasterToken; 'content-type'='application/json' }
$body = @{ user = $UserId } | ConvertTo-Json -Depth 3
$resp = Invoke-RestMethod -Method Post -Uri 'https://dashboard.thehousemonk.com/integration/glynk/access-token' -Headers $headers -Body $body

if(-not $resp.accessToken){ throw "No accessToken in response." }

$Env:THM_TOKEN = $resp.accessToken
$Env:THM_CLIENT_ID = $ClientId

Write-Host "Got user token. Running uploader..."
node upload_files_and_json.js


