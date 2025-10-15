package model

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// UserGroup 用户组表
type UserGroup struct {
	Id          int            `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string         `json:"name" gorm:"type:varchar(64);not null;uniqueIndex"` // 用户组名称，唯一
	DisplayName string         `json:"display_name" gorm:"type:varchar(128);not null"`     // 显示名称
	Description string         `json:"description" gorm:"type:text"`                      // 描述
	Config      string         `json:"config" gorm:"type:longtext"`                        // JSON配置，包含自动分配规则等
	Status      int            `json:"status" gorm:"default:1"`                           // 状态：1启用，2禁用
	CreatedTime int64          `json:"created_time" gorm:"bigint"`
	UpdatedTime int64          `json:"updated_time" gorm:"bigint"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// UserGroupConfig 用户组配置
type UserGroupConfig struct {
	// 自动分配规则
	AutoAssignRules []AutoAssignRule `json:"auto_assign_rules"`
	
	// 权限设置
	Permissions UserGroupPermissions `json:"permissions"`
	
	// 其他配置
	Extra map[string]interface{} `json:"extra,omitempty"`
}

// AutoAssignRule 自动分配规则
type AutoAssignRule struct {
	Type     string `json:"type"`     // 分配类型：github, email, discord, telegram等
	Pattern  string `json:"pattern"`  // 匹配模式：域名、用户ID前缀等
	Priority int    `json:"priority"` // 优先级，数字越小优先级越高
	Enabled  bool   `json:"enabled"`  // 是否启用
}

// UserGroupPermissions 用户组权限
type UserGroupPermissions struct {
	// 模型权限
	ModelPermissions []string `json:"model_permissions"`
	
	// 功能权限
	CanUseChat     bool `json:"can_use_chat"`
	CanUsePlayground bool `json:"can_use_playground"`
	CanUseDrawing  bool `json:"can_use_drawing"`
	CanUseMidjourney bool `json:"can_use_midjourney"`
	
	// 其他权限
	Extra map[string]bool `json:"extra,omitempty"`
}

// ModelGroup 模型分组表
type ModelGroup struct {
	Id          int            `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string         `json:"name" gorm:"type:varchar(64);not null;uniqueIndex"` // 分组名称，唯一
	DisplayName string         `json:"display_name" gorm:"type:varchar(128);not null"`     // 显示名称
	Description string         `json:"description" gorm:"type:text"`                      // 描述
	ModelList   string         `json:"model_list" gorm:"type:longtext"`                   // JSON格式的模型列表
	Status      int            `json:"status" gorm:"default:1"`                           // 状态：1启用，2禁用
	CreatedTime int64          `json:"created_time" gorm:"bigint"`
	UpdatedTime int64          `json:"updated_time" gorm:"bigint"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// UserGroupModelPermission 用户组与模型分组的权限关联表
type UserGroupModelPermission struct {
	Id            int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserGroupId   int    `json:"user_group_id" gorm:"not null;index"`     // 用户组ID
	ModelGroupId  int    `json:"model_group_id" gorm:"not null;index"`    // 模型分组ID
	Permission    int    `json:"permission" gorm:"default:1"`             // 权限级别：1只读，2可用
	CreatedTime   int64  `json:"created_time" gorm:"bigint"`
	UpdatedTime   int64  `json:"updated_time" gorm:"bigint"`
}

// TableName 设置表名
func (UserGroup) TableName() string {
	return "user_groups"
}

func (ModelGroup) TableName() string {
	return "model_groups"
}

func (UserGroupModelPermission) TableName() string {
	return "user_group_model_permissions"
}

// Insert 插入用户组
func (ug *UserGroup) Insert() error {
	now := time.Now().Unix()
	ug.CreatedTime = now
	ug.UpdatedTime = now
	return DB.Create(ug).Error
}

// Update 更新用户组
func (ug *UserGroup) Update() error {
	ug.UpdatedTime = time.Now().Unix()
	return DB.Save(ug).Error
}

// Delete 删除用户组
func (ug *UserGroup) Delete() error {
	return DB.Delete(ug).Error
}

// GetConfig 获取用户组配置
func (ug *UserGroup) GetConfig() UserGroupConfig {
	config := UserGroupConfig{}
	if ug.Config != "" {
		json.Unmarshal([]byte(ug.Config), &config)
	}
	return config
}

// SetConfig 设置用户组配置
func (ug *UserGroup) SetConfig(config UserGroupConfig) {
	configBytes, _ := json.Marshal(config)
	ug.Config = string(configBytes)
}

// Insert 插入模型分组
func (mg *ModelGroup) Insert() error {
	now := time.Now().Unix()
	mg.CreatedTime = now
	mg.UpdatedTime = now
	return DB.Create(mg).Error
}

// Update 更新模型分组
func (mg *ModelGroup) Update() error {
	mg.UpdatedTime = time.Now().Unix()
	return DB.Save(mg).Error
}

// Delete 删除模型分组
func (mg *ModelGroup) Delete() error {
	return DB.Delete(mg).Error
}

// GetModelList 获取模型分组中的模型列表
func (mg *ModelGroup) GetModelList() []string {
	var models []string
	if mg.ModelList != "" {
		json.Unmarshal([]byte(mg.ModelList), &models)
	}
	return models
}

// SetModelList 设置模型分组中的模型列表
func (mg *ModelGroup) SetModelList(models []string) {
	modelBytes, _ := json.Marshal(models)
	mg.ModelList = string(modelBytes)
}

// GetAllUserGroups 获取所有用户组
func GetAllUserGroups() ([]*UserGroup, error) {
	var groups []*UserGroup
	err := DB.Where("status = ?", 1).Order("id DESC").Find(&groups).Error
	return groups, err
}

// GetAllModelGroups 获取所有模型分组
func GetAllModelGroups() ([]*ModelGroup, error) {
	var groups []*ModelGroup
	err := DB.Where("status = ?", 1).Order("id DESC").Find(&groups).Error
	return groups, err
}

// GetUserGroupById 根据ID获取用户组
func GetUserGroupById(id int) (*UserGroup, error) {
	var group UserGroup
	err := DB.First(&group, id).Error
	return &group, err
}

// GetModelGroupById 根据ID获取模型分组
func GetModelGroupById(id int) (*ModelGroup, error) {
	var group ModelGroup
	err := DB.First(&group, id).Error
	return &group, err
}

// GetUserGroupModelPermissions 获取用户组的模型权限
func GetUserGroupModelPermissions(userGroupId int) ([]*UserGroupModelPermission, error) {
	var permissions []*UserGroupModelPermission
	err := DB.Where("user_group_id = ?", userGroupId).Find(&permissions).Error
	return permissions, err
}

// CreateUserGroupModelPermission 创建用户组模型权限
func CreateUserGroupModelPermission(userGroupId, modelGroupId, permission int) error {
	perm := UserGroupModelPermission{
		UserGroupId:  userGroupId,
		ModelGroupId: modelGroupId,
		Permission:   permission,
		CreatedTime:  time.Now().Unix(),
		UpdatedTime:  time.Now().Unix(),
	}
	return DB.Create(&perm).Error
}

// UpdateUserGroupModelPermission 更新用户组模型权限
func UpdateUserGroupModelPermission(userGroupId, modelGroupId, permission int) error {
	updates := map[string]interface{}{
		"permission":   permission,
		"updated_time": time.Now().Unix(),
	}
	return DB.Model(&UserGroupModelPermission{}).
		Where("user_group_id = ? AND model_group_id = ?", userGroupId, modelGroupId).
		Updates(updates).Error
}

// DeleteUserGroupModelPermission 删除用户组模型权限
func DeleteUserGroupModelPermission(userGroupId, modelGroupId int) error {
	return DB.Where("user_group_id = ? AND model_group_id = ?", userGroupId, modelGroupId).
		Delete(&UserGroupModelPermission{}).Error
}

// GetUserGroupModelPermission 获取特定用户组对特定模型分组的权限
func GetUserGroupModelPermission(userGroupId, modelGroupId int) (*UserGroupModelPermission, error) {
	var perm UserGroupModelPermission
	err := DB.Where("user_group_id = ? AND model_group_id = ?", userGroupId, modelGroupId).
		First(&perm).Error
	return &perm, err
}

// IsUserGroupExists 检查用户组是否存在
func IsUserGroupExists(name string) (bool, error) {
	var count int64
	err := DB.Model(&UserGroup{}).Where("name = ?", name).Count(&count).Error
	return count > 0, err
}

// IsModelGroupExists 检查模型分组是否存在
func IsModelGroupExists(name string) (bool, error) {
	var count int64
	err := DB.Model(&ModelGroup{}).Where("name = ?", name).Count(&count).Error
	return count > 0, err
}

// GetAllUserGroupsWithPagination 获取所有用户组（带分页）
func GetAllUserGroupsWithPagination(startIdx int, pageSize int) ([]*UserGroup, int64, error) {
	var groups []*UserGroup
	var total int64
	
	db := DB.Model(&UserGroup{})
	err := db.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	
	err = db.Order("id desc").Limit(pageSize).Offset(startIdx).Find(&groups).Error
	return groups, total, err
}

// GetAllModelGroupsWithPagination 获取所有模型分组（带分页）
func GetAllModelGroupsWithPagination(startIdx int, pageSize int) ([]*ModelGroup, int64, error) {
	var groups []*ModelGroup
	var total int64
	
	db := DB.Model(&ModelGroup{})
	err := db.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	
	err = db.Order("id desc").Limit(pageSize).Offset(startIdx).Find(&groups).Error
	return groups, total, err
}

// SearchUserGroups 搜索用户组
func SearchUserGroups(keyword string, startIdx int, pageSize int) ([]*UserGroup, int64, error) {
	var groups []*UserGroup
	var total int64
	
	db := DB.Model(&UserGroup{})
	if keyword != "" {
		db = db.Where("name LIKE ? OR display_name LIKE ? OR description LIKE ?", 
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	
	err := db.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	
	err = db.Order("id desc").Limit(pageSize).Offset(startIdx).Find(&groups).Error
	return groups, total, err
}

// SearchModelGroups 搜索模型分组
func SearchModelGroups(keyword string, startIdx int, pageSize int) ([]*ModelGroup, int64, error) {
	var groups []*ModelGroup
	var total int64
	
	db := DB.Model(&ModelGroup{})
	if keyword != "" {
		db = db.Where("name LIKE ? OR display_name LIKE ? OR description LIKE ?", 
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	
	err := db.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	
	err = db.Order("id desc").Limit(pageSize).Offset(startIdx).Find(&groups).Error
	return groups, total, err
}

// UpdateUserGroupModelPermissions 批量更新用户组的模型权限
func UpdateUserGroupModelPermissions(userGroupId int, modelGroupIds []int) error {
	// 开启事务
	return DB.Transaction(func(tx *gorm.DB) error {
		// 删除旧的权限
		if err := tx.Where("user_group_id = ?", userGroupId).Delete(&UserGroupModelPermission{}).Error; err != nil {
			return err
		}
		
		// 创建新的权限
		now := time.Now().Unix()
		for _, modelGroupId := range modelGroupIds {
			perm := UserGroupModelPermission{
				UserGroupId:  userGroupId,
				ModelGroupId: modelGroupId,
				Permission:   2, // 默认可用权限
				CreatedTime:  now,
				UpdatedTime:  now,
			}
			if err := tx.Create(&perm).Error; err != nil {
				return err
			}
		}
		
		return nil
	})
}

// GetModelGroupsByUserGroup 获取用户组可访问的模型分组列表
func GetModelGroupsByUserGroup(userGroupId int) ([]*ModelGroup, error) {
	var modelGroups []*ModelGroup
	
	err := DB.Table("model_groups").
		Joins("INNER JOIN user_group_model_permissions ON model_groups.id = user_group_model_permissions.model_group_id").
		Where("user_group_model_permissions.user_group_id = ?", userGroupId).
		Where("model_groups.status = ?", 1).
		Find(&modelGroups).Error
	
	return modelGroups, err
}

// GetUserGroupByName 根据名称获取用户组
func GetUserGroupByName(name string) (*UserGroup, error) {
	var group UserGroup
	err := DB.Where("name = ?", name).First(&group).Error
	return &group, err
}

// GetModelGroupByName 根据名称获取模型分组
func GetModelGroupByName(name string) (*ModelGroup, error) {
	var group ModelGroup
	err := DB.Where("name = ?", name).First(&group).Error
	return &group, err
}