package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// CheckinRequest 签到请求
type CheckinRequest struct {
	CheckinCode string `json:"checkin_code"`
}

// CheckinUser 用户签到
func CheckinUser(c *gin.Context) {
	userId := c.GetInt("id")
	var req CheckinRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}

	// 执行签到
	quota, err := model.CheckinUser(userId, req.CheckinCode)
	if err != nil {
		// 检查错误类型
		if err.Error() == "already checked in today" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "今日已签到",
			})
			return
		}
		if err.Error() == "checkin function is disabled" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "签到功能已关闭",
			})
			return
		}
		if err.Error() == "invalid checkin code" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "签到码错误",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "签到失败: " + err.Error(),
		})
		return
	}

	// 记录日志
	model.RecordLog(userId, model.LogTypeSystem, "签到成功，获得 "+logger.LogQuota(quota))

	// 返回成功响应，格式化为美元显示
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "签到成功",
		"data": gin.H{
			"quota":         quota,
			"quota_display": "$" + logger.FormatQuota(quota),
		},
	})
}

// GetCheckinStatus 获取签到状态
func GetCheckinStatus(c *gin.Context) {
	userId := c.GetInt("id")

	// 检查今日是否已签到
	todayCheckin, err := model.GetTodayCheckin(userId)
	hasCheckedIn := err == nil

	// 获取签到统计
	stat, err := model.GetUserCheckinStat(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取签到统计失败: " + err.Error(),
		})
		return
	}

	// 获取签到配置
	config, err := model.GetCheckinConfig()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取签到配置失败: " + err.Error(),
		})
		return
	}

	response := gin.H{
		"has_checked_in": hasCheckedIn,
		"stat": gin.H{
			"total_checkins":      stat.TotalCheckins,
			"consecutive_days":    stat.ConsecutiveDays,
			"this_month_checkins": stat.ThisMonthCheckins,
			"total_quota":         stat.TotalQuota,
		},
		"config": gin.H{
			"enabled":              config.Enabled,
			"checkin_code_enabled": config.CheckinCodeEnabled,
			"calendar_enabled":     config.CalendarEnabled,
		},
	}

	// 如果今日已签到，返回签到信息
	if hasCheckedIn {
		response["today_checkin"] = gin.H{
			"quota":         todayCheckin.Quota,
			"quota_display": "$" + logger.FormatQuota(todayCheckin.Quota),
			"checkin_time":  todayCheckin.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    response,
	})
}

// GetCheckinHistory 获取签到历史
func GetCheckinHistory(c *gin.Context) {
	userId := c.GetInt("id")

	// 获取分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// 获取签到历史
	records, total, err := model.GetUserCheckinHistory(userId, page, pageSize)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取签到历史失败: " + err.Error(),
		})
		return
	}

	// 获取该用户所有签到日期集合，用于计算每条记录的连续签到天数
	allDatesSet, err := model.GetUserCheckinDates(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取签到历史失败: " + err.Error(),
		})
		return
	}

	// 格式化响应数据
	var formattedRecords []gin.H
	for _, record := range records {
		// 计算该记录发生当日的连续签到天数
		// 从 record.CheckinDate 开始，向前逐日检查是否在签到集合中
		consecutive := 0
		if record.CheckinDate != "" {
			if baseDay, err := time.Parse("2006-01-02", record.CheckinDate); err == nil {
				for i := 0; i < 365; i++ { // 最多检查一年，避免死循环
					d := baseDay.AddDate(0, 0, -i).Format("2006-01-02")
					if _, ok := allDatesSet[d]; ok {
						consecutive++
					} else {
						break
					}
				}
			}
		}
		formattedRecords = append(formattedRecords, gin.H{
			"id":               record.Id,
			"quota":            record.Quota,
			"quota_display":    "$" + logger.FormatQuota(record.Quota),
			"checkin_date":     record.CheckinDate,
			"checkin_code":     record.CheckinCode,
			"created_at":       record.CreatedAt,
			"consecutive_days": consecutive,
		})
	}

	// 构建分页信息
	pageInfo := common.PageInfo{
		Page:     page,
		PageSize: pageSize,
		Total:    int(total),
	}
	pageInfo.SetItems(formattedRecords)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    pageInfo,
	})
}

// GetCheckinConfig 获取签到配置（管理员用）
func GetCheckinConfig(c *gin.Context) {
	config, err := model.GetCheckinConfig()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取签到配置失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    config,
	})
}

// UpdateCheckinConfig 更新签到配置（管理员用）
type UpdateCheckinConfigRequest struct {
	Enabled                  bool   `json:"enabled"`
	MinQuota                 int    `json:"min_quota"`
	MaxQuota                 int    `json:"max_quota"`
	CheckinCodeEnabled       bool   `json:"checkin_code_enabled"`
	CheckinCode              string `json:"checkin_code"`
	ConsecutiveRewardEnabled bool   `json:"consecutive_reward_enabled"`
	ConsecutiveRewardQuota   int    `json:"consecutive_reward_quota"`
	CalendarEnabled          bool   `json:"calendar_enabled"`
}

func UpdateCheckinConfig(c *gin.Context) {
	var req UpdateCheckinConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}

	// 验证参数
	if req.MinQuota < 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "最小签到额度不能小于0",
		})
		return
	}

	if req.MaxQuota < 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "最大签到额度不能小于0",
		})
		return
	}

	if req.MaxQuota > 0 && req.MaxQuota < req.MinQuota {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "最大签到额度不能小于最小签到额度",
		})
		return
	}

	if req.ConsecutiveRewardQuota < 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "连续签到奖励额度不能小于0",
		})
		return
	}

	// 获取现有配置
	config, err := model.GetCheckinConfig()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取签到配置失败: " + err.Error(),
		})
		return
	}

	// 更新配置
	config.Enabled = req.Enabled
	config.MinQuota = req.MinQuota
	config.MaxQuota = req.MaxQuota
	config.CheckinCodeEnabled = req.CheckinCodeEnabled
	config.CheckinCode = req.CheckinCode
	config.ConsecutiveRewardEnabled = req.ConsecutiveRewardEnabled
	config.ConsecutiveRewardQuota = req.ConsecutiveRewardQuota
	config.CalendarEnabled = req.CalendarEnabled

	// 保存配置
	if err := model.UpdateCheckinConfig(config); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "更新签到配置失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "签到配置更新成功",
	})
}

// GetAllCheckinHistory 获取所有用户签到历史（管理员用）
func GetAllCheckinHistory(c *gin.Context) {
	// 获取分页参数
	pageInfo := common.GetPageQuery(c)
	page := pageInfo.GetPage()
	pageSize := pageInfo.GetPageSize()

	// 获取用户ID参数（可选）
	userIdStr := c.Query("user_id")
	var userId int
	var err error
	if userIdStr != "" {
		userId, err = strconv.Atoi(userIdStr)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "无效的用户ID",
			})
			return
		}
	}

	var records []*model.CheckinRecord
	var total int64

	if userId > 0 {
		// 获取特定用户的签到历史
		records, total, err = model.GetUserCheckinHistory(userId, page, pageSize)
	} else {
		// 获取所有用户的签到历史
		records, total, err = model.GetAllCheckinHistory(page, pageSize)
	}

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取签到历史失败: " + err.Error(),
		})
		return
	}

	// 格式化响应数据，包含用户信息
	var formattedRecords []gin.H
	for _, record := range records {
		// 获取用户信息
		user, err := model.GetUserById(record.UserId, false)
		var username string
		if err == nil {
			username = user.Username
		} else {
			username = "用户" + strconv.Itoa(record.UserId)
		}

		formattedRecords = append(formattedRecords, gin.H{
			"id":            record.Id,
			"user_id":       record.UserId,
			"username":      username,
			"quota":         record.Quota,
			"quota_display": "$" + logger.FormatQuota(record.Quota),
			"checkin_date":  record.CheckinDate,
			"checkin_code":  record.CheckinCode,
			"created_at":    record.CreatedAt,
		})
	}

	pageInfo.SetItems(formattedRecords)
	pageInfo.SetTotal(int(total))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    pageInfo,
	})
}
