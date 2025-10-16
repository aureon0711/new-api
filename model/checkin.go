package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// CheckinRecord 签到记录表
type CheckinRecord struct {
	Id          int       `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId      int       `json:"user_id" gorm:"index;not null;column:user_id"`        // 用户ID
	Quota       int       `json:"quota" gorm:"not null;default:0"`                     // 获得的额度
	CheckinDate string    `json:"checkin_date" gorm:"type:varchar(10);index;not null"` // 签到日期 YYYY-MM-DD
	CheckinCode string    `json:"checkin_code" gorm:"type:varchar(20)"`                // 使用的签到码（如果有）
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// CheckinConfig 签到配置表
type CheckinConfig struct {
	Id                       int       `json:"id" gorm:"primaryKey;autoIncrement"`
	Enabled                  bool      `json:"enabled" gorm:"default:false"`                    // 签到功能开关
	MinQuota                 int       `json:"min_quota" gorm:"default:100"`                    // 最小签到额度
	MaxQuota                 int       `json:"max_quota" gorm:"default:100"`                    // 最大签到额度（0表示不限制）
	CheckinCodeEnabled       bool      `json:"checkin_code_enabled" gorm:"default:false"`       // 签到码功能开关
	CheckinCode              string    `json:"checkin_code" gorm:"type:varchar(20)"`            // 当前签到码
	ConsecutiveRewardEnabled bool      `json:"consecutive_reward_enabled" gorm:"default:false"` // 连续签到奖励开关
	ConsecutiveRewardQuota   int       `json:"consecutive_reward_quota" gorm:"default:50"`      // 连续签到奖励额度
	CreatedAt                time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt                time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// CheckinStat 签到统计
type CheckinStat struct {
	TotalCheckins     int `json:"total_checkins"`      // 总签到次数
	ConsecutiveDays   int `json:"consecutive_days"`    // 连续签到天数
	ThisMonthCheckins int `json:"this_month_checkins"` // 本月签到次数
	TotalQuota        int `json:"total_quota"`         // 总获得额度
}

// TableName 指定表名
func (CheckinRecord) TableName() string {
	return "checkin_records"
}

func (CheckinConfig) TableName() string {
	return "checkin_config"
}

// CreateCheckinRecord 创建签到记录
func CreateCheckinRecord(userId int, quota int, checkinCode string) error {
	checkinDate := time.Now().Format("2006-01-02")
	record := CheckinRecord{
		UserId:      userId,
		Quota:       quota,
		CheckinDate: checkinDate,
		CheckinCode: checkinCode,
	}
	return DB.Create(&record).Error
}

// GetTodayCheckin 获取今日签到记录
func GetTodayCheckin(userId int) (*CheckinRecord, error) {
	checkinDate := time.Now().Format("2006-01-02")
	var record CheckinRecord
	err := DB.Where("user_id = ? AND checkin_date = ?", userId, checkinDate).First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// GetUserCheckinHistory 获取用户签到历史（分页）
func GetUserCheckinHistory(userId int, page int, pageSize int) ([]*CheckinRecord, int64, error) {
	var records []*CheckinRecord
	var total int64

	offset := (page - 1) * pageSize

	// 获取总数
	err := DB.Model(&CheckinRecord{}).Where("user_id = ?", userId).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	err = DB.Where("user_id = ?", userId).
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&records).Error

	return records, total, err
}

// GetUserCheckinStat 获取用户签到统计
func GetUserCheckinStat(userId int) (*CheckinStat, error) {
	stat := &CheckinStat{}

	// 获取总签到次数和总额度
	err := DB.Model(&CheckinRecord{}).
		Select("COUNT(*) as total_checkins, COALESCE(SUM(quota), 0) as total_quota").
		Where("user_id = ?", userId).
		Scan(stat).Error
	if err != nil {
		return nil, err
	}

	// 获取连续签到天数
	consecutiveDays, err := calculateConsecutiveDays(userId)
	if err != nil {
		return nil, err
	}
	stat.ConsecutiveDays = consecutiveDays

	// 获取本月签到次数
	currentMonth := time.Now().Format("2006-01")
	var thisMonthCount int64
	err = DB.Model(&CheckinRecord{}).
		Where("user_id = ? AND checkin_date LIKE ?", userId, currentMonth+"%").
		Count(&thisMonthCount).Error
	if err != nil {
		return nil, err
	}
	stat.ThisMonthCheckins = int(thisMonthCount)

	return stat, nil
}

// GetUserCheckinDates 获取用户所有签到日期（YYYY-MM-DD）
func GetUserCheckinDates(userId int) (map[string]struct{}, error) {
	var dates []string
	err := DB.Model(&CheckinRecord{}).
		Where("user_id = ?", userId).
		Pluck("checkin_date", &dates).Error
	if err != nil {
		return nil, err
	}
	set := make(map[string]struct{}, len(dates))
	for _, d := range dates {
		set[d] = struct{}{}
	}
	return set, nil
}

// calculateConsecutiveDays 计算连续签到天数
func calculateConsecutiveDays(userId int) (int, error) {
	var checkinDates []string
	err := DB.Model(&CheckinRecord{}).
		Where("user_id = ?", userId).
		Order("checkin_date DESC").
		Limit(30). // 最多检查30天
		Pluck("checkin_date", &checkinDates).Error
	if err != nil {
		return 0, err
	}

	if len(checkinDates) == 0 {
		return 0, nil
	}

	consecutiveDays := 0
	today := time.Now()

	for i := 0; i < len(checkinDates); i++ {
		checkinDate, err := time.Parse("2006-01-02", checkinDates[i])
		if err != nil {
			continue
		}

		expectedDate := today.AddDate(0, 0, -i)
		if checkinDate.Year() == expectedDate.Year() &&
			checkinDate.Month() == expectedDate.Month() &&
			checkinDate.Day() == expectedDate.Day() {
			consecutiveDays++
		} else {
			break
		}
	}

	return consecutiveDays, nil
}

// GetCheckinConfig 获取签到配置
func GetCheckinConfig() (*CheckinConfig, error) {
	var config CheckinConfig
	err := DB.First(&config).Error
	if err != nil {
		// 如果配置不存在，返回默认配置
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &CheckinConfig{
				Enabled:                  false,
				MinQuota:                 100,
				MaxQuota:                 100,
				CheckinCodeEnabled:       false,
				CheckinCode:              "",
				ConsecutiveRewardEnabled: false,
				ConsecutiveRewardQuota:   50,
			}, nil
		}
		return nil, err
	}
	return &config, nil
}

// UpdateCheckinConfig 更新签到配置
func UpdateCheckinConfig(config *CheckinConfig) error {
	return DB.Save(config).Error
}

// CheckinUser 用户签到
func CheckinUser(userId int, checkinCode string) (int, error) {
	// 检查今日是否已签到
	_, err := GetTodayCheckin(userId)
	if err == nil {
		return 0, errors.New("already checked in today") // 已经签到过了
	}

	// 获取签到配置
	config, err := GetCheckinConfig()
	if err != nil {
		return 0, err
	}

	if !config.Enabled {
		return 0, errors.New("checkin function is disabled") // 签到功能未开启
	}

	// 检查签到码
	if config.CheckinCodeEnabled {
		if checkinCode != config.CheckinCode {
			return 0, errors.New("invalid checkin code") // 签到码错误
		}
	}

	// 计算签到额度
	baseQuota := config.MinQuota
	if config.MaxQuota > config.MinQuota {
		// 随机额度（这里简单实现，可以根据需要改为更复杂的算法）
		baseQuota = config.MinQuota
	}

	// 检查连续签到奖励
	finalQuota := baseQuota
	if config.ConsecutiveRewardEnabled {
		stat, err := GetUserCheckinStat(userId)
		if err == nil && stat.ConsecutiveDays > 0 {
			finalQuota += config.ConsecutiveRewardQuota
		}
	}

	// 创建签到记录
	err = CreateCheckinRecord(userId, finalQuota, checkinCode)
	if err != nil {
		return 0, err
	}

	// 增加用户额度
	err = IncreaseUserQuota(userId, finalQuota, true)
	if err != nil {
		return 0, err
	}

	return finalQuota, nil
}

// GetAllCheckinHistory 获取所有用户签到历史（管理员用）
func GetAllCheckinHistory(page int, pageSize int) ([]*CheckinRecord, int64, error) {
	var records []*CheckinRecord
	var total int64

	offset := (page - 1) * pageSize

	// 获取总数
	err := DB.Model(&CheckinRecord{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	err = DB.Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&records).Error

	return records, total, err
}
