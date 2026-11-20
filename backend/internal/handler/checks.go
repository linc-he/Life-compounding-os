package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/linc-he/Life-compounding-os/backend/internal/model"
	"github.com/linc-he/Life-compounding-os/backend/internal/store"
)

// TodayPoint 今日检查清单中单个复利点
type TodayPoint struct {
	PointID        uint   `json:"point_id"`
	Name           string `json:"name"`
	Contract       string `json:"contract"`
	CategoryID     uint   `json:"category_id"`
	Streak         int    `json:"streak"`
	TargetDays     int    `json:"target_days"`
	CheckedToday   bool   `json:"checked_today"`
	AllowanceLeft  int    `json:"allowance_left"`
	CooldownDays   int    `json:"cooldown_days,omitempty"` // 处于归档冷却时 >0
}

// GetToday 今日对照清单：所有 active 点 + 今日是否已打分 + streak
func GetToday(c *gin.Context) {
	date := checkDateToday()

	var actives []model.Point
	if err := store.DB.Where("status = ?", model.PointStatusActive).
		Order("created_at ASC").Find(&actives).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	// 今日打分记录
	todayChecks := map[uint]model.DailyCheck{}
	var checks []model.DailyCheck
	store.DB.Where("check_date = ?", date).Find(&checks)
	for _, ch := range checks {
		todayChecks[ch.PointID] = ch
	}

	// 本月豁免使用情况
	month := date[:7] // "2026-11"
	allowanceUsed := map[uint]int{}
	var monthly []model.DailyCheck
	store.DB.Where("check_date LIKE ?", month+"%").Find(&monthly)
	for _, ch := range monthly {
		if ch.UsedAllowance {
			allowanceUsed[ch.PointID]++
		}
	}

	// 归档冷却中的点，用于首页提醒
	var coolings []model.Point
	store.DB.Where("status = ?", model.PointStatusArchiving).Find(&coolings)

	result := make([]TodayPoint, 0, len(actives)+len(coolings))
	for _, p := range actives {
		tp := TodayPoint{
			PointID:       p.ID,
			Name:          p.Name,
			Contract:      p.Contract,
			CategoryID:    p.CategoryID,
			Streak:        calcStreak(p.ID, date),
			TargetDays:    p.TargetDays,
			CheckedToday:  containsKey(todayChecks, p.ID),
			AllowanceLeft: MonthlyAllowance - allowanceUsed[p.ID],
		}
		result = append(result, tp)
	}
	for _, p := range coolings {
		result = append(result, TodayPoint{
			PointID:      p.ID,
			Name:         p.Name,
			Contract:     p.Contract,
			CategoryID:   p.CategoryID,
			CooldownDays: daysLeft(*p.ArchivedAt, ArchiveCooldownDays),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"date":     date,
		"points":   result,
		"checking": coolings, // 语义提示：前端可据此渲染冷却提醒条
	})
}

type CheckReq struct {
	PointID  uint   `json:"point_id" binding:"required"`
	Score    int    `json:"score" binding:"min=0,max=5"`
	Note     string `json:"note"`
	UseAllowance bool `json:"use_allowance"`
}

// SubmitCheck 提交今日评分。
// 0 分 + 使用豁免时不算断；豁免每月最多 MonthlyAllowance 次。
func SubmitCheck(c *gin.Context) {
	var req CheckReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	date := checkDateToday()

	var p model.Point
	if err := store.DB.First(&p, req.PointID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "point not found"})
		return
	}
	if p.Status != model.PointStatusActive {
		c.JSON(http.StatusConflict, gin.H{"error": "复利点未处于 active 状态"})
		return
	}

	// 重复提交：同一天同一点只允许一条，允许当日修正
	var existing model.DailyCheck
	err := store.DB.Where("point_id = ? AND check_date = ?", req.PointID, date).
		First(&existing).Error
	if err == nil {
		// 当日修正
		existing.Score = req.Score
		existing.Note = req.Note
		existing.UsedAllowance = req.UseAllowance
		store.DB.Save(&existing)
		c.JSON(http.StatusOK, existing)
		return
	}

	// 豁免校验
	if req.UseAllowance {
		month := date[:7]
		var used int64
		store.DB.Model(&model.DailyCheck{}).
			Where("point_id = ? AND check_date LIKE ? AND used_allowance = true", req.PointID, month+"%").
			Count(&used)
		if int(used) >= MonthlyAllowance {
			c.JSON(http.StatusConflict, gin.H{"error": "本月豁免已用完（2 天）"})
			return
		}
	}

	chk := model.DailyCheck{
		PointID:       req.PointID,
		CheckDate:     date,
		Score:         req.Score,
		Note:          req.Note,
		UsedAllowance: req.UseAllowance,
	}
	if err := store.DB.Create(&chk).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	c.JSON(http.StatusCreated, chk)
}

// calcStreak 计算截至 date 的连续天数（豁免日不断）
func calcStreak(pointID uint, today string) int {
	var checks []model.DailyCheck
	store.DB.Where("point_id = ?", pointID).
		Where("check_date <= ?", today).
		Order("check_date DESC").Find(&checks)

	streak := 0
	day, _ := time.Parse("2006-01-02", today)
	for {
		ds := day.Format("2006-01-02")
		found := false
		for _, ch := range checks {
			if ch.CheckDate == ds && (ch.Score > 0 || ch.UsedAllowance) {
				found = true
				break
			}
		}
		if found {
			streak++
			day = day.AddDate(0, 0, -1)
		} else {
			break
		}
	}
	return streak
}

// containsKey 判断 map 中是否有该 pointID 的今日检查
func containsKey(m map[uint]model.DailyCheck, id uint) bool {
	_, ok := m[id]
	return ok
}

// daysLeft 冷却剩余天数（至少 0）
func daysLeft(from time.Time, totalDays int) int {
	left := totalDays - int(time.Since(from).Hours()/24)
	if left < 0 {
		return 0
	}
	return left
}
