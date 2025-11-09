#!/bin/bash

# Skip if environment variable is set
if [ -n "$SKIP_ERROR_REMINDER" ]; then
    exit 0
fi

# Set project directory
if [ -z "$CLAUDE_PROJECT_DIR" ]; then
    export CLAUDE_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

cat | npx tsx error-handling-reminder.ts
