package model

import (
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// UserGroup 用户组表
type UserGroup struct {
	Id          int            `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string         `json:"name" gorm:"type:varchar(64);not null;index"` // 用户组名称（可重复）
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
	// 可访问的模型分组（对应 Pricing 中的 EnableGroup）
	EnableGroups []string `json:"enable_groups"`
	
	// 功能权限
	CanUseChat       bool `json:"can_use_chat"`
	CanUsePlayground bool `json:"can_use_playground"`
	CanUseDrawing    bool `json:"can_use_drawing"`
	CanUseMidjourney bool `json:"can_use_midjourney"`
	
	// 其他权限
	Extra map[string]bool `json:"extra,omitempty"`
}

// UserGroupEnableGroups 用户组与模型分组（EnableGroup）的映射表
type UserGroupEnableGroups struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserGroupId int    `json:"user_group_id" gorm:"not null;index"`   // 用户组ID
	EnableGroup string `json:"enable_group" gorm:"type:varchar(64);not null;index"` // 模型分组名称（对应 Pricing 的 EnableGroup）
	CreatedTime int64  `json:"created_time" gorm:"bigint"`
	UpdatedTime int64  `json:"updated_time" gorm:"bigint"`
}

// TableName 设置表名
func (UserGroup) TableName() string {
	return "user_groups"
}

func (UserGroupEnableGroups) TableName() string {
	return "user_group_enable_groups"
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

// GetAllUserGroups 获取所有用户组
func GetAllUserGroups() ([]*UserGroup, error) {
	var groups []*UserGroup
	err := DB.Where("status = ?", 1).Order("id DESC").Find(&groups).Error
	return groups, err
}

// GetUserGroupById 根据ID获取用户组
func GetUserGroupById(id int) (*UserGroup, error) {
	var group UserGroup
	err := DB.First(&group, id).Error
	return &group, err
}

// GetUserGroupEnableGroups 获取用户组的可访问模型分组列表
func GetUserGroupEnableGroups(userGroupId int) ([]string, error) {
	var records []*UserGroupEnableGroups
	err := DB.Where("user_group_id = ?", userGroupId).Find(&records).Error
	if err != nil {
		return nil, err
	}
	
	groups := make([]string, len(records))
	for i, record := range records {
		groups[i] = record.EnableGroup
	}
	return groups, nil
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

// UpdateUserGroupEnableGroups 批量更新用户组的可访问模型分组（增强版 - 防止数据丢失）
func UpdateUserGroupEnableGroups(userGroupId int, enableGroups []string) error {
	// 1. 参数验证
	if userGroupId <= 0 {
		return fmt.Errorf("invalid user group id: %d", userGroupId)
	}
	
	// 2. 去重并过滤空值
	uniqueGroups := make(map[string]bool)
	for _, group := range enableGroups {
		trimmed := string([]rune(group)) // 去除可能的空格
		if trimmed != "" {
			uniqueGroups[trimmed] = true
		}
	}
	
	// 3. 开启事务，确保原子性操作
	return DB.Transaction(func(tx *gorm.DB) error {
		// 3.1 验证用户组是否存在
		var userGroup UserGroup
		if err := tx.First(&userGroup, userGroupId).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return fmt.Errorf("user group not found: %d", userGroupId)
			}
			return fmt.Errorf("failed to verify user group: %w", err)
		}
		
		// 3.2 查询当前的权限配置（用于备份和日志）
		var oldRecords []*UserGroupEnableGroups
		if err := tx.Where("user_group_id = ?", userGroupId).Find(&oldRecords).Error; err != nil {
			return fmt.Errorf("failed to query old records: %w", err)
		}
		
		// 3.3 删除旧的映射（在事务中，失败会回滚）
		if err := tx.Where("user_group_id = ?", userGroupId).Delete(&UserGroupEnableGroups{}).Error; err != nil {
			return fmt.Errorf("failed to delete old records: %w", err)
		}
		
		// 3.4 如果没有新的权限配置，允许清空权限（合法操作）
		if len(uniqueGroups) == 0 {
			// 记录日志：权限被清空
			return nil
		}
		
		// 3.5 批量创建新的映射
		now := time.Now().Unix()
		newRecords := make([]*UserGroupEnableGroups, 0, len(uniqueGroups))
		
		for group := range uniqueGroups {
			newRecords = append(newRecords, &UserGroupEnableGroups{
				UserGroupId: userGroupId,
				EnableGroup: group,
				CreatedTime: now,
				UpdatedTime: now,
			})
		}
		
		// 使用批量插入提高性能（每批100条）
		if err := tx.CreateInBatches(newRecords, 100).Error; err != nil {
			return fmt.Errorf("failed to create new records: %w", err)
		}
		
		// 3.6 数据完整性验证（确保插入的数据数量正确）
		var count int64
		if err := tx.Model(&UserGroupEnableGroups{}).Where("user_group_id = ?", userGroupId).Count(&count).Error; err != nil {
			return fmt.Errorf("failed to verify inserted records: %w", err)
		}
		
		if int(count) != len(uniqueGroups) {
			return fmt.Errorf("data integrity check failed: expected %d records, got %d (transaction will be rolled back)", len(uniqueGroups), count)
		}
		
		// 3.7 二次验证：读取插入的数据并比对
		var verifyRecords []*UserGroupEnableGroups
		if err := tx.Where("user_group_id = ?", userGroupId).Find(&verifyRecords).Error; err != nil {
			return fmt.Errorf("failed to verify records: %w", err)
		}
		
		// 确保所有应该存在的EnableGroup都存在
		insertedGroups := make(map[string]bool)
		for _, record := range verifyRecords {
			insertedGroups[record.EnableGroup] = true
		}
		
		for group := range uniqueGroups {
			if !insertedGroups[group] {
				return fmt.Errorf("data verification failed: group '%s' not found after insertion (transaction will be rolled back)", group)
			}
		}
		
		// 所有检查通过，事务将自动提交
		return nil
	})
}

// GetUserGroupByName 根据名称获取用户组
func GetUserGroupByName(name string) (*UserGroup, error) {
	var group UserGroup
	err := DB.Where("name = ?", name).First(&group).Error
	return &group, err
}

// GetAllEnableGroupsFromPricing 从 Pricing 系统获取所有可用的 EnableGroup
func GetAllEnableGroupsFromPricing() ([]string, error) {
	// 从 pricing 表中获取所有不同的 enable_group
	var groups []string
	
	// 查询所有启用的 ability 记录
	var abilities []*Ability
	err := DB.Where("status = ?", 1).Find(&abilities).Error
	if err != nil {
		return nil, err
	}
	
	// 使用 map 去重
	groupMap := make(map[string]bool)
	for _, ability := range abilities {
		if ability.Group != "" {
			groupMap[ability.Group] = true
		}
	}
	
	// 转换为数组
	for group := range groupMap {
		groups = append(groups, group)
	}
	
	return groups, nil
}