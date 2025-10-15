package controller

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
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

	// 检查名称是否已存在
	if exists, _ := model.IsUserGroupExists(group.Name); exists {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户组名称已存在",
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
	existingGroup, err := model.GetUserGroupById(group.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 如果更改了名称，检查新名称是否已被使用
	if existingGroup.Name != group.Name {
		if exists, _ := model.IsUserGroupExists(group.Name); exists {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "用户组名称已存在",
			})
			return
		}
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

// GetAllModelGroups 获取所有模型分组
func GetAllModelGroups(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	groups, total, err := model.GetAllModelGroupsWithPagination(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(groups)
	common.ApiSuccess(c, pageInfo)
}

// GetModelGroup 获取单个模型分组详情
func GetModelGroup(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	group, err := model.GetModelGroupById(id)
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

// CreateModelGroup 创建模型分组
func CreateModelGroup(c *gin.Context) {
	var group model.ModelGroup
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
			"message": "模型分组名称不能为空",
		})
		return
	}

	// 检查名称是否已存在
	if exists, _ := model.IsModelGroupExists(group.Name); exists {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "模型分组名称已存在",
		})
		return
	}

	if err := group.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "模型分组创建成功",
		"data":    group,
	})
}

// UpdateModelGroup 更新模型分组
func UpdateModelGroup(c *gin.Context) {
	var group model.ModelGroup
	err := json.NewDecoder(c.Request.Body).Decode(&group)
	if err != nil || group.Id == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}

	// 检查模型分组是否存在
	existingGroup, err := model.GetModelGroupById(group.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 如果更改了名称，检查新名称是否已被使用
	if existingGroup.Name != group.Name {
		if exists, _ := model.IsModelGroupExists(group.Name); exists {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "模型分组名称已存在",
			})
			return
		}
	}

	if err := group.Update(); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "模型分组更新成功",
	})
}

// DeleteModelGroup 删除模型分组
func DeleteModelGroup(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	group, err := model.GetModelGroupById(id)
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
		"message": "模型分组删除成功",
	})
}

// SearchModelGroups 搜索模型分组
func SearchModelGroups(c *gin.Context) {
	keyword := c.Query("keyword")
	pageInfo := common.GetPageQuery(c)
	
	groups, total, err := model.SearchModelGroups(keyword, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(groups)
	common.ApiSuccess(c, pageInfo)
}

// GetUserGroupModelPermissions 获取用户组的模型权限
func GetUserGroupModelPermissions(c *gin.Context) {
	userGroupId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	permissions, err := model.GetUserGroupModelPermissions(userGroupId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    permissions,
	})
}

// UpdateUserGroupModelPermissions 更新用户组的模型权限
func UpdateUserGroupModelPermissions(c *gin.Context) {
	userGroupId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	var requestData struct {
		ModelGroupIds []int `json:"model_group_ids"`
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
	if err := model.UpdateUserGroupModelPermissions(userGroupId, requestData.ModelGroupIds); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "权限更新成功",
	})
}

// GetModelGroupsByUserGroup 获取用户组可访问的模型分组列表
func GetModelGroupsByUserGroup(c *gin.Context) {
	userGroupId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	modelGroups, err := model.GetModelGroupsByUserGroup(userGroupId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    modelGroups,
	})
}