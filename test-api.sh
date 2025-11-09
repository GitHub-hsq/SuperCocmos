#!/bin/bash

# API 测试脚本
# 测试 SuperCocmos 后端 API

# 配置
API_BASE="http://localhost:3002/api"
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlRERHJrUlBVbHlTUi1hM3hjcGYydSJ9.eyJodHRwOi8vc3VwZXJjb2Ntb3MuY29tL3JvbGVzIjpbIkFkbWluIl0sImlzcyI6Imh0dHBzOi8vZGV2LTFjbjZyOGI3c3pvNmZzMHkudXMuYXV0aDAuY29tLyIsInN1YiI6ImF1dGgwfDY4ZmU0NzAxYmQ5YjhhMWJlM2U1M2EzYSIsImF1ZCI6WyJodHRwOi8vc3VwZXJjb2Ntb3MuY29tIiwiaHR0cHM6Ly9kZXYtMWNuNnI4Yjdzem82ZnMweS51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzYyNTk1MjczLCJleHAiOjE3NjI2ODE2NzMsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhenAiOiJ0WkRaTlVFM2RIWnJtNldydE5RR2lkbU5PaFlyajEzNCIsInBlcm1pc3Npb25zIjpbInJlYWQ6c3RhdGljcyJdfQ.JpI4_DCky1VoVQkUdmcobmy3bWyLh2Byveuxl6BQJ6aD9dpZue5EWB53bJTYa21F_WD2esnMmq4uW1Cr73U6KFfYvOkt3IKjyLJJgCLcjymBiLU_vPz2pDG0rTubD-z5EMF8Sc4sVI9bq4NMjLOIQRHHpI9moJpVdc6whH8ozuuN89ZmHTKJrsn59O7qbss7cF_nGvS-1RoVXB5QX3XRzUGOyqbI3ha8w5rsX1jxbI7X0ggylRDXakk3DoDnmgXeGBK_vKxDeNzk2NhOynlsOwHG1sfBQTORsPx6IujFGeBkaL4L0BL21_op0OiVsFZzj73ExS7lrG611iBkybD6EQ"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL=0
PASSED=0
FAILED=0

# 测试函数
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4

  TOTAL=$((TOTAL + 1))

  echo -e "${BLUE}====================【测试 $TOTAL】====================${NC}"
  echo -e "${YELLOW}描述:${NC} $description"
  echo -e "${YELLOW}请求:${NC} $method $endpoint"

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" --max-time 10 -X "$method" "$API_BASE$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" 2>&1)
  else
    echo -e "${YELLOW}请求体:${NC} $data"
    response=$(curl -s -w "\n%{http_code}" --max-time 10 -X "$method" "$API_BASE$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" 2>&1)
  fi

  # 检查是否有错误
  if echo "$response" | grep -q "curl:"; then
    echo -e "${RED}❌ 失败 - 连接错误${NC}"
    echo "$response"
    FAILED=$((FAILED + 1))
  else
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    echo -e "${YELLOW}HTTP 状态码:${NC} $http_code"

    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
      echo -e "${GREEN}✅ 成功${NC}"
      echo -e "${YELLOW}响应:${NC}"
      echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
      PASSED=$((PASSED + 1))
    else
      echo -e "${RED}❌ 失败${NC}"
      echo -e "${YELLOW}响应:${NC}"
      echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
      FAILED=$((FAILED + 1))
    fi
  fi

  echo ""
}

# 开始测试
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       SuperCocmos API 测试                                 ║${NC}"
echo -e "${BLUE}║       API Base: $API_BASE                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ==============================================
# 认证相关测试
# ==============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       🔐 认证相关测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/auth/me" "" "获取当前用户信息"

# ==============================================
# 角色管理测试
# ==============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       👥 角色管理测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/roles" "" "获取所有角色"

# ==============================================
# 配置管理测试
# ==============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       ⚙️  配置管理测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/config" "" "获取用户完整配置"
test_endpoint "GET" "/config/user-settings" "" "获取用户设置"
test_endpoint "GET" "/config/chat" "" "获取聊天配置"

# ==============================================
# 供应商和模型测试
# ==============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       🔌 供应商和模型测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/providers" "" "获取所有供应商及其模型"

# ==============================================
# 会话管理测试
# ==============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       💬 会话管理测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/conversations" "" "获取用户的所有会话列表"

# ==============================================
# 使用量统计测试
# ==============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       📊 使用量统计测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "POST" "/usage" '{"startDate":"2025-01-01","endDate":"2025-12-31"}' "获取 API 使用量"

# ==============================================
# 小说工作流测试
# ==============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       📚 小说工作流测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "GET" "/novels" "" "获取用户的所有小说"

# ==============================================
# 测试总结
# ==============================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       测试总结                                             ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC} 总测试数: ${YELLOW}$TOTAL${NC}"
echo -e "${BLUE}║${NC} 通过数:   ${GREEN}$PASSED${NC}"
echo -e "${BLUE}║${NC} 失败数:   ${RED}$FAILED${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 所有测试通过！${NC}"
  exit 0
else
  echo -e "${RED}❌ 有 $FAILED 个测试失败${NC}"
  exit 1
fi
