@echo off
REM LLM 连接测试脚本 (Windows)

echo 🧪 正在测试 LLM 连接...
echo.

curl -X POST http://localhost:3002/api/quiz/test-llm -H "Content-Type: application/json"

echo.
echo.
echo ✅ 测试完成！
pause

