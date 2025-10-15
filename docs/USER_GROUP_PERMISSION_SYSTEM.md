# 用户权限管理系统使用说明

## 概述

本系统实现了完整的用户权限管理功能，包含用户组管理和模型权限管理两个核心模块。管理员可以通过该系统灵活配置用户组，并为不同用户组分配可访问的模型分组。

## 功能特性

### 1. 用户组管理
- ✅ 创建、编辑、删除用户组
- ✅ 支持JSON配置自动分配规则
- ✅ 基于用户注册来源自动分配用户组
- ✅ 搜索和分页功能
- ✅ 启用/禁用用户组状态管理

### 2. 模型分组管理
- ✅ 创建、编辑、删除模型分组
- ✅ 支持JSON格式配置模型列表
- ✅ 查看模型分组包含的模型数量
- ✅ 搜索和分页功能
- ✅ 启用/禁用模型分组状态管理

### 3. 权限映射管理
- ✅ 为用户组配置可访问的模型分组
- ✅ 复选框界面，支持灵活调整权限
- ✅ 实时保存权限配置
- ✅ 直观的权限配置界面

## 数据库结构

### 用户组表 (user_groups)
```sql
CREATE TABLE user_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) UNIQUE NOT NULL,           -- 用户组唯一标识
    display_name VARCHAR(255) NOT NULL,          -- 显示名称
    description TEXT,                             -- 描述
    config JSON,                                  -- JSON配置（自动分配规则等）
    status INT DEFAULT 1,                         -- 状态：1=启用，0=禁用
    created_time BIGINT,                          -- 创建时间
    updated_time BIGINT,                          -- 更新时间
    deleted_at DATETIME                           -- 软删除时间
);
```

### 模型分组表 (model_groups)
```sql
CREATE TABLE model_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) UNIQUE NOT NULL,           -- 模型分组唯一标识
    display_name VARCHAR(255) NOT NULL,          -- 显示名称
    description TEXT,                             -- 描述
    model_list JSON,                              -- 模型列表（JSON数组）
    status INT DEFAULT 1,                         -- 状态：1=启用，0=禁用
    created_time BIGINT,                          -- 创建时间
    updated_time BIGINT,                          -- 更新时间
    deleted_at DATETIME                           -- 软删除时间
);
```

### 权限关联表 (user_group_model_permissions)
```sql
CREATE TABLE user_group_model_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_group_id INT NOT NULL,                  -- 用户组ID
    model_group_id INT NOT NULL,                 -- 模型分组ID
    created_time BIGINT,                          -- 创建时间
    UNIQUE KEY (user_group_id, model_group_id)
);
```

## API接口

### 用户组管理接口

#### 获取所有用户组（分页）
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
  "config": {
    "auto_assign": {
      "enabled": true,
      "register_source": "github"
    }
  },
  "status": 1
}
```

#### 更新用户组
```
PUT /api/user_group
Content-Type: application/json

{
  "id": 1,
  "name": "github_users",
  "display_name": "GitHub用户组",
  "description": "通过GitHub注册的用户",
  "config": {
    "auto_assign": {
      "enabled": true,
      "register_source": "github"
    }
  },
  "status": 1
}
```

#### 删除用户组
```
DELETE /api/user_group/:id
```

### 模型分组管理接口

#### 获取所有模型分组（分页）
```
GET /api/model_group?page=1&size=10
```

#### 搜索模型分组
```
GET /api/model_group/search?keyword=premium&page=1&size=10
```

#### 创建模型分组
```
POST /api/model_group
Content-Type: application/json

{
  "name": "premium_models",
  "display_name": "高级模型组",
  "description": "包含高级AI模型",
  "model_list": ["gpt-4", "gpt-4-turbo", "claude-3-opus"],
  "status": 1
}
```

#### 更新模型分组
```
PUT /api/model_group
Content-Type: application/json

{
  "id": 1,
  "name": "premium_models",
  "display_name": "高级模型组",
  "description": "包含高级AI模型",
  "model_list": ["gpt-4", "gpt-4-turbo", "claude-3-opus", "claude-3.5-sonnet"],
  "status": 1
}
```

#### 删除模型分组
```
DELETE /api/model_group/:id
```

### 权限管理接口

#### 获取用户组的模型权限
```
GET /api/user_group/:id/permissions
```

#### 更新用户组的模型权限
```
PUT /api/user_group/:id/permissions
Content-Type: application/json

{
  "model_group_ids": [1, 2, 3]
}
```

#### 获取用户组可访问的模型分组
```
GET /api/user_group/:id/model_groups
```

## 前端使用指南

### 访问管理界面

1. 以超级管理员身份登录系统
2. 进入"设置"页面
3. 在设置页面中找到以下两个标签：
   - **用户组管理**：管理用户组
   - **模型权限**：管理模型分组和配置权限

### 用户组管理

#### 创建用户组
1. 点击"创建用户组"按钮
2. 填写以下信息：
   - **用户组名称**：唯一标识，只能包含字母、数字和下划线（创建后不可修改）
   - **显示名称**：用于界面显示的友好名称
   - **描述**：用户组的详细描述
   - **JSON配置**：自动分配规则配置（可选）
   - **状态**：启用或禁用
3. 点击"创建"按钮保存

#### JSON配置示例
```json
{
  "auto_assign": {
    "enabled": true,
    "register_source": "github"
  }
}
```

#### 编辑用户组
1. 在用户组列表中点击"编辑"按钮
2. 修改相关信息（注意：用户组名称不可修改）
3. 点击"更新"按钮保存

#### 删除用户组
1. 在用户组列表中点击"删除"按钮
2. 确认删除操作

### 模型权限管理

#### 模型分组管理
1. 切换到"模型分组管理"标签
2. 点击"创建模型分组"按钮
3. 填写以下信息：
   - **分组名称**：唯一标识
   - **显示名称**：友好名称
   - **描述**：分组描述
   - **模型列表JSON**：JSON数组格式的模型列表
   - **状态**：启用或禁用

#### 模型列表JSON示例
```json
["gpt-4", "gpt-4-turbo", "claude-3-opus", "claude-3-sonnet"]
```

#### 配置权限映射
1. 切换到"权限配置"标签
2. 在用户组列表中点击"配置权限"按钮
3. 在弹出的对话框中，使用复选框选择该用户组可以访问的模型分组
4. 点击"保存"按钮

## 使用场景示例

### 场景1：为GitHub用户创建专属用户组

1. **创建用户组**
   - 名称：`github_users`
   - 显示名称：`GitHub用户组`
   - 配置：
   ```json
   {
     "auto_assign": {
       "enabled": true,
       "register_source": "github"
     }
   }
   ```

2. **创建模型分组**
   - 名称：`github_models`
   - 显示名称：`GitHub用户模型`
   - 模型列表：`["gpt-3.5-turbo", "gpt-4"]`

3. **配置权限**
   - 为`github_users`用户组分配`github_models`模型分组的访问权限

### 场景2：为付费用户创建高级模型组

1. **创建用户组**
   - 名称：`premium_users`
   - 显示名称：`付费用户组`

2. **创建模型分组**
   - 名称：`premium_models`
   - 显示名称：`高级模型组`
   - 模型列表：`["gpt-4-turbo", "claude-3-opus", "claude-3.5-sonnet"]`

3. **配置权限**
   - 为`premium_users`用户组分配`premium_models`模型分组的访问权限

## 权限控制

- 所有用户组和模型权限管理接口都使用`middleware.RootAuth()`中间件保护
- 只有超级管理员（root用户）可以访问这些功能
- 前端界面也只对超级管理员可见

## 数据一致性保障

- 用户组名称和模型分组名称具有唯一性约束
- 使用事务处理批量权限更新，确保原子性
- 软删除机制保护数据安全
- 创建时间和更新时间自动管理

## 注意事项

1. **用户组名称**创建后不可修改，请谨慎命名
2. **模型分组名称**创建后不可修改
3. **JSON配置**必须是有效的JSON格式
4. **模型列表**必须是JSON数组格式
5. 删除用户组或模型分组时，相关的权限映射关系会自动清理
6. 建议定期备份数据库

## 故障排查

### 创建用户组失败
- 检查用户组名称是否已存在
- 检查JSON配置格式是否正确
- 确认当前用户具有超级管理员权限

### 权限配置不生效
- 检查用户组状态是否为"启用"
- 检查模型分组状态是否为"启用"
- 确认权限映射已正确保存

### API请求失败
- 检查网络连接
- 确认后端服务正常运行
- 查看浏览器控制台错误信息
- 检查后端日志

## 技术栈

### 后端
- Go + Gin
- GORM
- MySQL/PostgreSQL/SQLite

### 前端
- React
- Semi Design UI
- Axios

## 文件结构

```
后端文件：
- model/user_group.go          # 数据模型和数据库操作
- controller/user_group.go     # API控制器
- router/api-router.go         # 路由配置
- model/main.go                # 数据库迁移

前端文件：
- web/src/components/settings/UserGroupSetting.jsx         # 用户组管理组件
- web/src/components/settings/ModelPermissionSetting.jsx   # 模型权限管理组件
- web/src/pages/Setting/index.jsx                          # 设置页面入口
```

## 更新日志

### v1.0.0 (2025-10-15)
- ✅ 实现用户组管理功能
- ✅ 实现模型分组管理功能
- ✅ 实现权限映射配置功能
- ✅ 完成前后端完整实现
- ✅ 集成到系统设置页面

## 后续计划

- [ ] 实现用户自动分配到用户组的逻辑
- [ ] 添加批量操作功能
- [ ] 实现权限继承机制
- [ ] 添加权限日志记录
- [ ] 实现权限模板功能

## 联系方式

如有问题或建议，请联系：support@quantumnous.com