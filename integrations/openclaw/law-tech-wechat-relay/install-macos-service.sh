#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
OPENCLAW_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}"
ENV_FILE="$OPENCLAW_DIR/.env"
PLIST="$HOME/Library/LaunchAgents/dev.law-tech.wechat-outbound.plist"
LOG_DIR="$HOME/Library/Logs"
LABEL="dev.law-tech.wechat-outbound"
NODE_BIN="$(command -v node)"
OPENCLAW_BIN="$(command -v openclaw)"

[[ -n "$NODE_BIN" ]] || { echo '找不到 node'; exit 1; }
[[ -n "$OPENCLAW_BIN" ]] || { echo '找不到 openclaw'; exit 1; }
mkdir -p "$OPENCLAW_DIR" "$HOME/Library/LaunchAgents" "$LOG_DIR"

if ! grep -Eq '^DEEPSEEK_API_KEY=.+$' "$ENV_FILE" 2>/dev/null; then
  printf '请输入 DeepSeek API Key（不会回显）：'
  IFS= read -r -s DEEPSEEK_KEY
  echo
  [[ -n "$DEEPSEEK_KEY" ]] || { echo 'DeepSeek API Key 不能为空'; exit 1; }
  DEEPSEEK_KEY_INPUT="$DEEPSEEK_KEY" python3 - "$ENV_FILE" <<'PY'
from pathlib import Path
import os
import sys
path = Path(sys.argv[1])
key = os.environ.pop('DEEPSEEK_KEY_INPUT')
lines = path.read_text(encoding='utf-8').splitlines() if path.exists() else []
lines = [line for line in lines if not line.startswith('DEEPSEEK_API_KEY=')]
lines.append(f'DEEPSEEK_API_KEY={key}')
path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
PY
  unset DEEPSEEK_KEY
  chmod 600 "$ENV_FILE"
fi

if ! openclaw plugins list 2>/dev/null | grep -qi 'deepseek'; then
  openclaw plugins install @openclaw/deepseek-provider
fi

RUNTIME_JSON="$(node "$HERE/src/local-runner.js" --runtime-only 2>/dev/null || true)"
DESIRED_MODEL="$(python3 - "$OPENCLAW_DIR/openclaw.json" <<'PY'
from pathlib import Path
import json, sys, urllib.request
p=Path(sys.argv[1])
data=json.loads(p.read_text(encoding='utf-8'))
def walk(v):
    if isinstance(v,dict):
        if 'law-tech-wechat-relay' in v and isinstance(v['law-tech-wechat-relay'],dict):
            return v['law-tech-wechat-relay']
        for x in v.values():
            r=walk(x)
            if r:return r
    if isinstance(v,list):
        for x in v:
            r=walk(x)
            if r:return r
    return {}
r=walk(data)
def find(v,k):
    if isinstance(v,dict):
        for a,b in v.items():
            if a.lower()==k:return b
            z=find(b,k)
            if z:return z
    if isinstance(v,list):
        for x in v:
            z=find(x,k)
            if z:return z
    return ''
url=str(find(r,'captureurl')).replace('/api/schedule/capture','').rstrip('/')+'/api/integrations/openclaw/runtime-config'
token=str(find(r,'token'))
req=urllib.request.Request(url,headers={'Authorization':f'Bearer {token}'})
try:
    with urllib.request.urlopen(req,timeout=30) as res:
        payload=json.load(res)
        print(payload.get('model') or 'deepseek/deepseek-v4-flash')
except Exception:
    print('deepseek/deepseek-v4-flash')
PY
)"

openclaw models set "$DESIRED_MODEL"
openclaw gateway restart
sleep 3
openclaw models status \
  --probe \
  --probe-provider deepseek \
  --probe-max-tokens 8

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$HERE/src/local-runner.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$HERE</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>OPENCLAW_BIN</key>
    <string>$OPENCLAW_BIN</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/law-tech-wechat-outbound.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/law-tech-wechat-outbound.err.log</string>
</dict>
</plist>
EOF
chmod 600 "$PLIST"

launchctl bootout "gui/$UID/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$UID" "$PLIST"
launchctl kickstart -k "gui/$UID/$LABEL"

node "$HERE/src/local-runner.js" --probe
node "$HERE/src/local-runner.js" --once

echo
printf '✓ OpenClaw 已切换为 %s\n' "$DESIRED_MODEL"
echo "✓ 微信主动发送 Relay 已安装为登录后自动常驻服务"
echo "日志：$LOG_DIR/law-tech-wechat-outbound.log"
