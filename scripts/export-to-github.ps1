Param(
  [string]$Destination = "github-repo"
)

$ErrorActionPreference = "Stop"

try {
  $projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
  $src = $projectRoot.Path
  $dst = Join-Path $projectRoot $Destination

  if (Test-Path $dst) {
    Write-Host "清理目标目录: $dst"
    Remove-Item -Recurse -Force $dst
  }
  New-Item -ItemType Directory -Path $dst | Out-Null

  Write-Host "开始复制项目到 $dst（排除敏感与无关文件）"
  # robocopy 公共参数（作为数组传入，避免在控制台输出数组文本）
  $robocopyCommon = @("/E", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS", "/NP")

  # 复制主目录（排除目录）
  robocopy $src $dst $robocopyCommon /XD `
    ".git" ".cursor" "terminals" "node_modules" "dist" "build" ".vscode" ".idea" $Destination | Out-Null

  # 全局排除敏感文件
  robocopy $src $dst $robocopyCommon /XF `
    "project.private.config.json" `
    "miniprogram\config.ts" `
    "config.ts" `
    "config.js" `
    ".env" ".env.local" ".env.*" | Out-Null

  # 再次清理所有 node_modules
  Get-ChildItem -Path $dst -Recurse -Directory -Filter "node_modules" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

  # 覆盖（或写入）导出的 README 与 .gitignore（使用项目内模板；若模板缺失则自动生成）
  $tplReadme = Join-Path $projectRoot "github-repo\README.md"
  $tplIgnore = Join-Path $projectRoot "github-repo\.gitignore"
  $dstReadme = Join-Path $dst "README.md"
  $dstIgnore = Join-Path $dst ".gitignore"
  if (Test-Path $tplReadme) {
    Copy-Item -Force $tplReadme $dstReadme
  } else {
    @"
# 开源版导出

本目录由脚本导出生成，已排除敏感信息。请参考 `miniprogram/config.example.ts` 复制为 `config.ts` 填写真实密钥后再本地运行。
"@ | Set-Content -Encoding UTF8 $dstReadme
  }
  if (Test-Path $tplIgnore) {
    Copy-Item -Force $tplIgnore $dstIgnore
  } else {
    @"
project.private.config.json
miniprogram/config.ts
cloudfunctions/**/config.js
cloudfunctions/**/.env
**/node_modules/
dist/
build/
.idea/
.vscode/
.history/
.DS_Store
Thumbs.db
.cursor/
terminals/
.env
.env.*
"@ | Set-Content -Encoding UTF8 $dstIgnore
  }

  Write-Host ("Export done: {0}" -f $dst)
  Write-Host ("Next steps in {0}:" -f $Destination)
  Write-Host "  git init; git add .; git commit -m `"init`"; git branch -M main; git remote add origin <repo>; git push -u origin main"
} catch {
  Write-Error $_.Exception.Message
  exit 1
}

