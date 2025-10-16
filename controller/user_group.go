package controller

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
)

// GetAllUserGroups 获取所有用户组
func GetAllUserGroups(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	groups, total, err := model.GetAllUserGroupsWithPagination(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(groups)
	common.ApiSuccess(c, pageInfo)
}

// GetUserGroup 获取单个用户组详情
func GetUserGroup(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	group, err := model.GetUserGroupById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    group,
	})
}

// CreateUserGroup 创建用户组
func CreateUserGroup(c *gin.Context) {
	var group model.UserGroup
	err := json.NewDecoder(c.Request.Body).Decode(&group)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}

	if group.Name == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户组名称不能为空",
		})
		return
	}

	if err := group.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户组创建成功",
		"data":    group,
	})
}

// UpdateUserGroup 更新用户组
func UpdateUserGroup(c *gin.Context) {
	var group model.UserGroup
	err := json.NewDecoder(c.Request.Body).Decode(&group)
	if err != nil || group.Id == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}

	// 检查用户组是否存在
	_, err = model.GetUserGroupById(group.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	if err := group.Update(); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户组更新成功",
	})
}

// DeleteUserGroup 删除用户组
func DeleteUserGroup(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	group, err := model.GetUserGroupById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	if err := group.Delete(); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户组删除成功",
	})
}

// SearchUserGroups 搜索用户组
func SearchUserGroups(c *gin.Context) {
	keyword := c.Query("keyword")
	pageInfo := common.GetPageQuery(c)

	groups, total, err := model.SearchUserGroups(keyword, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(groups)
	common.ApiSuccess(c, pageInfo)
}

// GetAllEnableGroups 获取所有可用的模型分组（从 Pricing 系统）
func GetAllEnableGroups(c *gin.Context) {
	// 1) 来自 Pricing 的启用分组（Ability.Group）
	pricingGroups, err := model.GetAllEnableGroupsFromPricing()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 2) 来自“分组与模型倍率设置”的分组（ratio_setting 中的分组名）
	ratioGroupsMap := ratio_setting.GetGroupRatioCopy()

	// 3) 取并集并去重
	groupSet := make(map[string]struct{})
	for g := range ratioGroupsMap {
		if g == "" {
			continue
		}
		groupSet[g] = struct{}{}
	}
	for _, g := range pricingGroups {
		if g == "" {
			continue
		}
		groupSet[g] = struct{}{}
	}

	// 4) 转为切片返回（保持稳定输出但无需强制排序）
	result := make([]string, 0, len(groupSet))
	for g := range groupSet {
		result = append(result, g)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    result,
	})
}

// GetUserGroupEnableGroups 获取用户组的可访问模型分组
func GetUserGroupEnableGroups(c *gin.Context) {
	userGroupId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	groups, err := model.GetUserGroupEnableGroups(userGroupId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    groups,
	})
}

// UpdateUserGroupEnableGroups 更新用户组的可访问模型分组
func UpdateUserGroupEnableGroups(c *gin.Context) {
	userGroupId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	var requestData struct {
		EnableGroups []string `json:"enable_groups"`
	}

	err = json.NewDecoder(c.Request.Body).Decode(&requestData)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}

	// 检查用户组是否存在
	_, err = model.GetUserGroupById(userGroupId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 更新权限
	if err := model.UpdateUserGroupEnableGroups(userGroupId, requestData.EnableGroups); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "权限更新成功",
	})
}
