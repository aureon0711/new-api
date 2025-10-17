package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func abortWithOpenAiMessage(c *gin.Context, statusCode int, message string, code ...string) {
	codeStr := ""
	if len(code) > 0 {
		codeStr = code[0]
	}
	userId := c.GetInt("id")
	c.JSON(statusCode, gin.H{
		"error": gin.H{
			"message": common.MessageWithRequestId(message, c.GetString(common.RequestIdKey)),
			"type":    "new_api_error",
			"code":    codeStr,
		},
	})
	c.Abort()
	
	// 构建详细的错误日志信息，包含分组、模型、IP等信息
	logMessage := fmt.Sprintf("错误 | 用户ID: %d | IP: %s", userId, c.ClientIP())
	
	// 尝试获取用户组信息
	if userId > 0 {
		userCache, err := model.GetUserCache(userId)
		if err == nil && userCache.Group != "" {
			logMessage += fmt.Sprintf(" | 用户组: %s", userCache.Group)
		}
	}
	
	// 尝试获取模型信息（从上下文中获取已设置的值）
	if originalModel, exists := c.Get("original_model"); exists {
		if modelStr, ok := originalModel.(string); ok && modelStr != "" {
			logMessage += fmt.Sprintf(" | 模型: %s", modelStr)
		}
	}
	
	// 尝试获取分组信息
	if tokenGroup, ok := common.GetContextKey(c, constant.ContextKeyTokenGroup); ok {
		if groupStr, ok := tokenGroup.(string); ok && groupStr != "" {
			logMessage += fmt.Sprintf(" | 请求分组: %s", groupStr)
		}
	}
	
	// 尝试获取使用的分组信息
	if usingGroup, ok := common.GetContextKey(c, constant.ContextKeyUsingGroup); ok {
		if groupStr, ok := usingGroup.(string); ok && groupStr != "" {
			logMessage += fmt.Sprintf(" | 使用分组: %s", groupStr)
		}
	}
	
	// 尝试获取渠道信息
	if channelName, ok := common.GetContextKey(c, constant.ContextKeyChannelName); ok {
		if nameStr, ok := channelName.(string); ok && nameStr != "" {
			logMessage += fmt.Sprintf(" | 渠道: %s", nameStr)
		}
	}
	
	// 添加错误消息
	logMessage += fmt.Sprintf(" | 错误信息: %s", message)
	
	logger.LogError(c.Request.Context(), logMessage)

	// ========== 记录到错误日志表（补充“未知”记录缺失字段）===========
	if statusCode >= 400 { // 仅对错误状态做记录
		if _, recorded := c.Get("_error_log_recorded"); !recorded { // 避免重复
			// 补充 original_model
			modelName := c.GetString("original_model")
			if modelName == "" {
				// 尝试从 body 解析 {"model":"..."}
				if c.Request != nil && c.Request.Body != nil {
					var bodyBytes []byte
					bodyBytes, _ = io.ReadAll(c.Request.Body)
					if len(bodyBytes) > 0 {
						// 还原 Body 供后续中间件使用
						c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
						var bodyMap map[string]interface{}
						if json.Unmarshal(bodyBytes, &bodyMap) == nil {
							if m, ok := bodyMap["model"].(string); ok && m != "" {
								modelName = m
								c.Set("original_model", modelName)
							}
						}
					}
				}
				// GET /v1/realtime?model=xxx 形式
				if modelName == "" && c.Request != nil && c.Request.Method == http.MethodGet {
					qModel := c.Query("model")
					if qModel != "" {
						modelName = qModel
						c.Set("original_model", modelName)
					}
				}
			}

			// 补充分组信息
			userGroup := common.GetContextKeyString(c, constant.ContextKeyUsingGroup)
			if userGroup == "" {
				userGroup = common.GetContextKeyString(c, constant.ContextKeyTokenGroup)
			}
			if userGroup == "" {
				userGroup = c.GetString("group")
			}

			tokenName := c.GetString("token_name")
			tokenId := c.GetInt("token_id")
			channelId := c.GetInt("channel_id")
			other := map[string]interface{}{
				"status_code": statusCode,
				"error_code":  codeStr,
			}
			if c.Request != nil && c.Request.URL != nil {
				other["request_path"] = c.Request.URL.Path
			}
			model.RecordErrorLog(c, userId, channelId, modelName, tokenName, message, tokenId, 0, false, userGroup, other)
			c.Set("_error_log_recorded", true)
		}
	}
}

func abortWithMidjourneyMessage(c *gin.Context, statusCode int, code int, description string) {
	c.JSON(statusCode, gin.H{
		"description": description,
		"type":        "new_api_error",
		"code":        code,
	})
	c.Abort()
	
	// 构建详细的错误日志信息，包含分组、模型、IP等信息
	userId := c.GetInt("id")
	logMessage := fmt.Sprintf("Midjourney错误 | 用户ID: %d | IP: %s", userId, c.ClientIP())
	
	// 尝试获取用户组信息
	if userId > 0 {
		userCache, err := model.GetUserCache(userId)
		if err == nil && userCache.Group != "" {
			logMessage += fmt.Sprintf(" | 用户组: %s", userCache.Group)
		}
	}
	
	// 尝试获取模型信息（从上下文中获取已设置的值）
	if originalModel, exists := c.Get("original_model"); exists {
		if modelStr, ok := originalModel.(string); ok && modelStr != "" {
			logMessage += fmt.Sprintf(" | 模型: %s", modelStr)
		}
	}
	
	// 尝试获取分组信息
	if tokenGroup, ok := common.GetContextKey(c, constant.ContextKeyTokenGroup); ok {
		if groupStr, ok := tokenGroup.(string); ok && groupStr != "" {
			logMessage += fmt.Sprintf(" | 请求分组: %s", groupStr)
		}
	}
	
	// 尝试获取使用的分组信息
	if usingGroup, ok := common.GetContextKey(c, constant.ContextKeyUsingGroup); ok {
		if groupStr, ok := usingGroup.(string); ok && groupStr != "" {
			logMessage += fmt.Sprintf(" | 使用分组: %s", groupStr)
		}
	}
	
	// 尝试获取渠道信息
	if channelName, ok := common.GetContextKey(c, constant.ContextKeyChannelName); ok {
		if nameStr, ok := channelName.(string); ok && nameStr != "" {
			logMessage += fmt.Sprintf(" | 渠道: %s", nameStr)
		}
	}
	
	// 添加错误消息
	logMessage += fmt.Sprintf(" | 错误代码: %d | 错误描述: %s", code, description)
	
	logger.LogError(c.Request.Context(), logMessage)
}
