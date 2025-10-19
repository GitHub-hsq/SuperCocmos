# 快速开始：模型角色权限系统

## 🚀 5分钟快速配置

### 步骤 1：执行数据库脚本

在 Supabase SQL Editor 中依次执行：

```sql
-- 1. 创建模型-角色权限表
\i service/src/db/model-role-access-schema.sql
```

### 步骤 2：创建会员角色

```sql
INSERT INTO roles (role_name, role_code, description) VALUES
  ('VIP会员', 'vip', 'VIP会员可以访问高级模型'),
  ('高级会员', 'premium', '高级会员可以访问部分高级模型'),
  ('免费用户', 'free', '免费用户只能访问基础模型');
```

### 步骤 3：设置模型权限

```sql
-- 场景：三级会员制
-- GPT-3.5: 所有人（不设置权限）
-- GPT-4o-mini: Premium 以上
-- GPT-4o: VIP 以上

-- GPT-4o-mini 权限设置
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id
FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o-mini'
  AND r.role_code IN ('premium', 'vip', 'admin');

-- GPT-4o 权限设置
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id
FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o'
  AND r.role_code IN ('vip', 'admin');
```

### 步骤 4：给用户分配角色

```sql
-- 查询用户 ID（通过邮箱）
SELECT user_id, email FROM users WHERE email = 'user@example.com';

-- 分配 VIP 角色
INSERT INTO user_roles (user_id, role_id) VALUES
  ('查询到的user-uuid', (SELECT role_id FROM roles WHERE role_code = 'vip'));
```

### 步骤 5：验证

```sql
-- 检查用户可以访问哪些模型
SELECT * FROM get_user_accessible_models('user-uuid');
```

---

## 📊 配置示例

### 示例 1：基础版（所有人都能用）

```sql
-- 不插入任何记录到 model_role_access
-- 所有用户都能访问 GPT-3.5-turbo
```

### 示例 2：VIP 专属模型

```sql
INSERT INTO model_role_access (model_id, role_id)
VALUES (
  (SELECT id FROM models WHERE display_name = 'OpenAI_gpt-4o'),
  (SELECT role_id FROM roles WHERE role_code = 'vip')
);
```

### 示例 3：渐进式开放

```sql
-- GPT-3.5: 所有人
-- （不设置）

-- GPT-4o-mini: Premium + VIP + Admin
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o-mini'
  AND r.role_code IN ('premium', 'vip', 'admin');

-- GPT-4o: 仅 VIP + Admin
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o'
  AND r.role_code IN ('vip', 'admin');
```

---

## 🔍 验证清单

- [ ] 数据库脚本执行成功
- [ ] 角色表中有数据
- [ ] 模型-角色权限表中有记录
- [ ] 用户被分配了角色
- [ ] API 返回的模型列表正确过滤
- [ ] 聊天时权限检查生效
- [ ] API Key 不传递给前端

---

## 🛠️ 常用查询

```sql
-- 查看某个用户的角色
SELECT u.email, r.role_name, r.role_code
FROM users u
JOIN user_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id
WHERE u.email = 'user@example.com';

-- 查看某个模型的访问权限
SELECT m.display_name, r.role_name, r.role_code
FROM models m
JOIN model_role_access mra ON m.id = mra.model_id
JOIN roles r ON mra.role_id = r.role_id
WHERE m.display_name = 'OpenAI_gpt-4o';

-- 查看用户可以访问的模型
SELECT * FROM get_user_accessible_models(
  (SELECT user_id FROM users WHERE email = 'user@example.com')
);
```

---

## ⚡ API 快速参考

### 管理员接口

```bash
# 获取所有模型及角色
GET /api/model-roles/all

# 设置模型权限
POST /api/model-roles/set
{
  "modelId": "uuid",
  "roleIds": ["role-uuid-1", "role-uuid-2"]
}

# 对所有人开放
POST /api/model-roles/set
{
  "modelId": "uuid",
  "roleIds": []
}
```

### 用户接口

```bash
# 获取可访问的模型（自动过滤）
GET /models

# 发送聊天（会检查权限）
POST /api/chat-process
{
  "prompt": "Hello",
  "model": "OpenAI_gpt-4o"
}
```

---

**完成时间**: < 5 分钟
**难度**: ⭐⭐☆☆☆
**推荐指数**: ⭐⭐⭐⭐⭐
