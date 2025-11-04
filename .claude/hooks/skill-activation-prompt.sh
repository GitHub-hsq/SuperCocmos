#!/bin/bash
set -e

# 如果环境变量未设置，使用脚本所在位置的父目录
if [ -z "$CLAUDE_PROJECT_DIR" ]; then
    export CLAUDE_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

cd "$CLAUDE_PROJECT_DIR/.claude/hooks"
cat | npx tsx skill-activation-prompt.ts
