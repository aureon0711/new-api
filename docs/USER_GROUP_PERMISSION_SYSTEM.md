# 用户权限管理系统使用文档

## 概述

用户权限管理系统提供了灵活的用户分组和模型访问权限控制功能。系统包含两个核心模块：

1. **用户组管理**：创建和管理用户组，支持基于注册来源的自动分配
2. **模型权限管理**：为不同用户组配置可访问的模型分组

## 系统架构

### 数据模型

#### 1. UserGroup (用户组)
```go
type UserGroup struct {
    Id          int            // 主键ID
    Name        string         // 用户组名称（可重复）
    DisplayName string         // 显示名称
    Description string         // 描述
    Config      string         // JSON配置（自动分配规则等）
    Status      int            // 状态：1启用，0禁用
    CreatedTime int64          // 创建时间
    UpdatedTime int64          // 更新时间
    DeletedAt   gorm.DeletedAt // 软删除标记
}
```

#### 2. UserGroupEnableGroups (用户组权限映射)
```go
type UserGroupEnableGroups struct {
    Id          int    // 主键ID
    UserGroupId int    // 用户组ID
    EnableGroup string // 模型分组名称（来自Pricing系统）
    CreatedTime int64  // 创建时间
    UpdatedTime int64  // 更新时间
}
```

### 关键特性

1. **用户组名称可重复**：支持多次修改用户组名称，无唯一性限制
2. **模型分组集成**：直接使用"分组与模型定价设置"中配置的EnableGroup
3. **灵活的权限映射**：通过复选框为用户组分配多个模型分组

## 功能模块

### 一、用户组管理

#### 1.1 访问路径
系统设置 → 用户组管理

#### 1.2 创建用户组

**步骤：**
1. 点击"创建用户组"按钮
2. 填写基本信息：
   - **名称**：用户组标识（可重复）
   - **显示名称**：在界面上显示的名称
   - **描述**：用户组的详细说明
   - **JSON配置**：自动分配规则等配置
   - **状态**：启用/禁用

3. 点击"创建"完成

**JSON配置示例：**
```json
{
  "auto_assign_rules": [
    {
      "type": "github",
      "pattern": "",
      "priority": 1,
      "enabled": true
    },
    {
      "type": "email",
      "pattern": "@company.com",
      "priority": 2,
      "enabled": true
    }
  ],
  "permissions": {
    "enable_groups": ["default", "premium"],
    "can_use_chat": true,
    "can_use_playground": true,
    "can_use_drawing": false,
    "can_use_midjourney": false
  }
}
```

**配置字段说明：**
- `auto_assign_rules`：自动分配规则数组
  - `type`：分配类型（github、email、discord、telegram等）
  - `pattern`：匹配模式（如邮箱域名）
  - `priority`：优先级（数字越小优先级越高）
  - `enabled`：是否启用此规则

- `permissions`：权限配置
  - `enable_groups`：可访问的模型分组列表
  - `can_use_*`：功能权限开关

#### 1.3 编辑用户组

**步骤：**
1. 在用户组列表中找到目标用户组
2. 点击"编辑"按钮
3. 修改需要更改的字段（包括名称）
4. 点击"更新"保存

**注意：**
- 用户组名称可以随时修改，无唯一性限制
- 修改配置后立即生效

#### 1.4 删除用户组

**步骤：**
1. 点击用户组行的"删除"按钮
2. 确认删除操作

**注意：**
- 删除操作不可恢复
- 删除用户组会同时删除其所有权限映射

#### 1.5 搜索用户组

在搜索框中输入关键词，可按以下字段搜索：
- 用户组名称
- 显示名称
- 描述

### 二、模型权限管理

#### 2.1 访问路径
系统设置 → 模型权限设置

#### 2.2 系统说明

模型权限管理系统直接使用"分组与模型定价设置"中配置的模型分组（EnableGroup）。

**重要提示：**
- 模型分组来自Pricing系统，无需在此处创建
- 如需添加或修改模型分组，请前往"分组与模型定价设置"页面
- 此处仅负责将现有的模型分组分配给用户组

#### 2.3 配置用户组权限

**步骤：**
1. 在用户组列表中找到目标用户组
2. 点击"配置权限"按钮
3. 在弹窗中勾选该用户组可访问的模型分组
4. 点击"保存"完成配置

**界面功能：**
- 显示所有可用的模型分组（来自Pricing系统）
- 使用复选框进行多选
- 实时保存，立即生效

#### 2.4 权限生效说明

用户访问模型时，系统会：
1. 查询用户所属的用户组
2. 获取该用户组的EnableGroup权限列表
3. 仅允许访问已授权的模型分组中的模型

## API接口

### 用户组管理接口

#### 获取所有用户组
```
GET /api/user_group?page=1&size=10
```

#### 搜索用户组
```
GET /api/user_group/search?keyword=github&page=1&size=10
```

#### 获取单个用户组
```
GET /api/user_group/:id
```

#### 创建用户组
```
POST /api/user_group
Content-Type: application/json

{
  "name": "github_users",
  "display_name": "GitHub用户组",
  "description": "通过GitHub注册的用户",
  "config": "{...}",
  "status": 1
}
```

#### 更新用户组
```
PUT /api/user_group
Content-Type: application/json

{
  "id": 1,
  "name": "github_premium",
  "display_name": "GitHub高级用户",
  "description": "通过GitHub注册的高级用户",
  "config": "{...}",
  "status": 1
}
```

#### 删除用户组
```
DELETE /api/user_group/:id
```

### 权限管理接口

#### 获取所有可用的模型分组
```
GET /api/enable_group
```

响应示例：
```json
{
  "success": true,
  "message": "",
  "data": ["default", "premium", "enterprise", "free"]
}
```

#### 获取用户组的权限配置
```
GET /api/user_group/:id/enable_groups
```

响应示例：
```json
{
  "success": true,
  "message": "",
  "data": ["default", "premium"]
}
```

#### 更新用户组的权限配置
```
PUT /api/user_group/:id/enable_groups
Content-Type: application/json

{
  "enable_groups": ["default", "premium", "enterprise"]
}
```

## 使用场景

### 场景1：为GitHub用户创建专属用户组

1. 创建用户组：
   - 名称：`github_users`
   - 显示名称：`GitHub用户`
   - 配置自动分配规则（type: github）

2. 配置权限：
   - 分配模型分组：default、premium

3. 结果：所有通过GitHub注册的用户自动加入此组，可访问default和premium分组的模型

### 场景2：企业邮箱用户权限控制

1. 创建用户组：
   - 名称：`enterprise_users`
   - 显示名称：`企业用户`
   - 配置邮箱匹配规则（pattern: @company.com）

2. 配置权限：
   - 分配模型分组：default、premium、enterprise

3. 结果：@company.com邮箱注册的用户自动获得企业级权限

### 场景3：免费用户权限限制

1. 创建用户组：
   - 名称：`free_users`
   - 显示名称：`免费用户`

2. 配置权限：
   - 仅分配模型分组：free

3. 结果：免费用户只能访问free分组中的模型

## 权限验证流程

```
用户请求访问模型
    ↓
查询用户所属用户组
    ↓
获取用户组的EnableGroup列表
    ↓
检查请求的模型是否在允许的EnableGroup中
    ↓
允许/拒绝访问
```

## 最佳实践

### 1. 用户组规划

- **按来源分组**：GitHub用户、邮箱用户、Discord用户等
- **按等级分组**：免费用户、付费用户、企业用户
- **按功能分组**：仅聊天用户、完整功能用户

### 2. 权限配置

- **最小权限原则**：默认分配最基础的权限
- **渐进式授权**：根据用户行为逐步提升权限
- **清晰的分组命名**：使用易于理解的名称

### 3. 自动分配规则

- **优先级设置**：确保规则的执行顺序符合预期
- **定期审查**：检查自动分配规则是否按预期工作
- **测试验证**：新规则上线前进行充分测试

### 4. 模型分组管理

- **在"分组与模型定价设置"中统一管理**：所有模型分组配置在此页面完成
- **使用语义化命名**：如free、basic、premium、enterprise
- **文档化分组内容**：记录每个分组包含的模型列表

## 故障排查

### 问题1：用户无法访问某些模型

**排查步骤：**
1. 确认用户所属的用户组
2. 检查用户组的EnableGroup配置
3. 确认模型所属的EnableGroup
4. 验证EnableGroup是否在用户组的权限列表中

### 问题2：自动分配规则不生效

**排查步骤：**
1. 检查用户组状态是否为"启用"
2. 验证JSON配置格式是否正确
3. 确认规则的enabled字段为true
4. 检查pattern匹配规则是否正确

### 问题3：找不到可用的模型分组

**解决方案：**
1. 前往"分组与模型定价设置"页面
2. 配置渠道的模型能力
3. 确保模型已启用并分配了EnableGroup
4. 返回模型权限设置页面，刷新即可看到

## 技术说明

### 数据库表结构

#### user_groups表
```sql
CREATE TABLE `user_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `display_name` varchar(128) NOT NULL,
  `description` text,
  `config` longtext,
  `status` int DEFAULT 1,
  `created_time` bigint,
  `updated_time` bigint,
  `deleted_at` bigint,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_deleted_at` (`deleted_at`)
);
```

#### user_group_enable_groups表
```sql
CREATE TABLE `user_group_enable_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_group_id` int NOT NULL,
  `enable_group` varchar(64) NOT NULL,
  `created_time` bigint,
  `updated_time` bigint,
  PRIMARY KEY (`id`),
  KEY `idx_user_group_id` (`user_group_id`),
  KEY `idx_enable_group` (`enable_group`)
);
```

### 关键实现

#### 获取EnableGroup列表
```go
func GetAllEnableGroupsFromPricing() ([]string, error) {
    var abilities []*Ability
    err := DB.Where("status = ?", 1).Find(&abilities).Error
    if err != nil {
        return nil, err
    }
    
    groupMap := make(map[string]bool)
    for _, ability := range abilities {
        if ability.Group != "" {
            groupMap[ability.Group] = true
        }
    }
    
    groups := make([]string, 0, len(groupMap))
    for group := range groupMap {
        groups = append(groups, group)
    }
    
    return groups, nil
}
```

## 更新日志

### v1.1.0 (2025-01-15)
- **重大改进**：移除用户组名称唯一性约束，支持随时修改名称
- **架构优化**：删除ModelGroup模型，直接使用Pricing系统的EnableGroup
- **界面简化**：模型权限设置页面简化为单一界面
- **集成增强**：与"分组与模型定价设置"深度集成

### v1.0.0 (2025-01-01)
- 初始版本发布
- 用户组管理功能
- 模型权限配置功能
- 自动分配规则支持

## 常见问题 (FAQ)

**Q: 用户组名称可以重复吗？**
