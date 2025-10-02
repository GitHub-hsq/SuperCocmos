#!/bin/bash
# LLM 连接测试脚本

echo "🧪 正在测试 LLM 连接..."
echo ""

curl -X POST http://localhost:3002/api/quiz/test-llm \
  -H "Content-Type: application/json" \
  -w "\n\n⏱️  响应时间: %{time_total}s\n" \
  | json_pp

echo ""
echo "✅ 测试完成！"

