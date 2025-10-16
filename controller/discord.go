package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type DiscordOAuthResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

type DiscordUser struct {
	ID            string `json:"id"`
	Username      string `json:"username"`
	Discriminator string `json:"discriminator"`
	GlobalName    string `json:"global_name"`
	Email         string `json:"email"`
	Verified      bool   `json:"verified"`
	Avatar        string `json:"avatar"`
}

// buildRedirectURI 构建 Discord 回调地址。
// 注意：前端在发起授权时使用的是 window.location.origin 作为 redirect_uri 的域名部分，
// 因此这里必须与当前请求的 Host 完全一致，否则 Discord 在交换 code 时会报 invalid_grant。
// 为了兼容系统设置中的 ServerAddress：只有当 ServerAddress 的 Host 与当前请求 Host 相同
// 时，才使用其协议（http/https）；否则一律以请求中的 Host/协议为准。
// 回调固定为根路径 /oauth/discord（不带 /api 前缀）。
func buildRedirectURI(c *gin.Context) string {
	// 推断请求协议
	scheme := "http"
	if c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https") {
		scheme = "https"
	}
	host := c.Request.Host

	// 如果配置了 ServerAddress，且其 Host 与当前 Host 一致，则采用配置中的协议
	if sa := strings.TrimSpace(system_setting.ServerAddress); sa != "" {
		if parsed, err := url.Parse(sa); err == nil && parsed.Host != "" {
			if strings.EqualFold(parsed.Host, host) && parsed.Scheme != "" {
				scheme = parsed.Scheme
			}
		}
	}

	return fmt.Sprintf("%s://%s/oauth/discord", scheme, host)
}

func getDiscordUserInfoByCode(c *gin.Context, code string) (*DiscordUser, error) {
	if code == "" {
		return nil, errors.New("无效的参数")
	}

	// 交换授权码获取访问令牌
	// Discord token端点只接受 application/x-www-form-urlencoded 格式
	values := url.Values{}
	values.Set("client_id", common.DiscordClientId)
	values.Set("client_secret", common.DiscordClientSecret)
	values.Set("code", code)
	values.Set("grant_type", "authorization_code")
	// 注意：回调路由为 /oauth/discord（不带 /api 前缀）
	values.Set("redirect_uri", buildRedirectURI(c))

	// Discord OAuth2 token 端点不使用版本号（参考官方文档）
	req, err := http.NewRequest("POST", "https://discord.com/api/oauth2/token", strings.NewReader(values.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := http.Client{
		Timeout: 5 * time.Second,
	}

	res, err := client.Do(req)
	if err != nil {
		common.SysLog(err.Error())
		return nil, errors.New("无法连接至 Discord 服务器，请稍后重试！")
	}
	defer res.Body.Close()

	// 检查HTTP状态码
	if res.StatusCode != http.StatusOK {
		var errorResponse map[string]interface{}
		json.NewDecoder(res.Body).Decode(&errorResponse)
		common.SysLog(fmt.Sprintf("Discord token exchange failed: status=%d, response=%v", res.StatusCode, errorResponse))
		return nil, errors.New("Discord 授权失败，请检查配置并重试")
	}

	var oAuthResponse DiscordOAuthResponse
	err = json.NewDecoder(res.Body).Decode(&oAuthResponse)
	if err != nil {
		common.SysLog(fmt.Sprintf("Failed to decode Discord token response: %v", err))
		return nil, err
	}

	// 检查访问令牌是否存在
	if oAuthResponse.AccessToken == "" {
		common.SysLog(fmt.Sprintf("Discord access token is empty, response: %+v", oAuthResponse))
		return nil, errors.New("Discord 授权失败，未获取到访问令牌")
	}

	// 使用访问令牌获取用户信息
	// 获取当前用户信息端点
	req, err = http.NewRequest("GET", "https://discord.com/api/users/@me", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", oAuthResponse.AccessToken))

	res2, err := client.Do(req)
	if err != nil {
		common.SysLog(err.Error())
		return nil, errors.New("无法连接至 Discord 服务器，请稍后重试！")
	}
	defer res2.Body.Close()

	// 检查HTTP状态码
	if res2.StatusCode != http.StatusOK {
		var errorResponse map[string]interface{}
		json.NewDecoder(res2.Body).Decode(&errorResponse)
		common.SysLog(fmt.Sprintf("Discord user info request failed: status=%d, response=%v", res2.StatusCode, errorResponse))
		return nil, errors.New("获取 Discord 用户信息失败")
	}

	var discordUser DiscordUser
	err = json.NewDecoder(res2.Body).Decode(&discordUser)
	if err != nil {
		common.SysLog(fmt.Sprintf("Failed to decode Discord user response: %v", err))
		return nil, err
	}

	if discordUser.ID == "" {
		common.SysLog(fmt.Sprintf("Discord user ID is empty, full response: %+v", discordUser))
		return nil, errors.New("返回值非法，用户字段为空，请稍后重试！")
	}

	return &discordUser, nil
}

func DiscordOAuth(c *gin.Context) {
	session := sessions.Default(c)
	state := c.Query("state")
	if state == "" || session.Get("oauth_state") == nil || state != session.Get("oauth_state").(string) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "state is empty or not same",
		})
		return
	}

	username := session.Get("username")
	if username != nil {
		DiscordBind(c)
		return
	}

	if !common.DiscordOAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "管理员未开启通过 Discord 登录以及注册",
		})
		return
	}

	code := c.Query("code")
	discordUser, err := getDiscordUserInfoByCode(c, code)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	user := model.User{
		DiscordId: discordUser.ID,
	}

	// 检查 Discord ID 是否已被使用
	if model.IsDiscordIdAlreadyTaken(user.DiscordId) {
		// 根据 Discord ID 填充用户信息
		err := user.FillUserByDiscordId()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		// 检查用户是否已被删除
		if user.Id == 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "用户已注销",
			})
			return
		}
	} else {
		// 如果 Discord ID 未被使用，创建新用户
		if common.RegisterEnabled {
			user.Username = "discord_" + strconv.Itoa(model.GetMaxUserId()+1)

			// 优先使用 global_name，如果没有则使用 username
			displayName := discordUser.GlobalName
			if displayName == "" {
				displayName = discordUser.Username
			}
			if displayName != "" {
				user.DisplayName = displayName
			} else {
				user.DisplayName = "Discord User"
			}

			user.Email = discordUser.Email
			user.Role = common.RoleCommonUser
			user.Status = common.UserStatusEnabled
			// 直接使用管理员配置的Discord注册用户组
			user.Group = common.UserGroupForDiscord

			affCode := session.Get("aff")
			inviterId := 0
			if affCode != nil {
				inviterId, _ = model.GetUserIdByAffCode(affCode.(string))
			}

			if err := user.Insert(inviterId); err != nil {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": err.Error(),
				})
				return
			}
		} else {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "管理员关闭了新用户注册",
			})
			return
		}
	}

	if user.Status != common.UserStatusEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "用户已被封禁",
			"success": false,
		})
		return
	}

	setupLogin(&user, c)
}

func DiscordBind(c *gin.Context) {
	if !common.DiscordOAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "管理员未开启通过 Discord 登录以及注册",
		})
		return
	}

	code := c.Query("code")
	discordUser, err := getDiscordUserInfoByCode(c, code)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	user := model.User{
		DiscordId: discordUser.ID,
	}

	if model.IsDiscordIdAlreadyTaken(user.DiscordId) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "该 Discord 账户已被绑定",
		})
		return
	}

	session := sessions.Default(c)
	id := session.Get("id")
	user.Id = id.(int)

	err = user.FillUserById()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	user.DiscordId = discordUser.ID
	err = user.Update(false)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "bind",
	})
}
