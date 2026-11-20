package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/linc-he/Life-compounding-os/backend/internal/model"
	"github.com/linc-he/Life-compounding-os/backend/internal/store"
)

// MaxActivePoints 聚焦上限：同时 active 的复利点数量
const MaxActivePoints = 5

// PendingQuietHours 添加后的冷静期（小时）
const PendingQuietHours = 24

// ArchiveCooldownDays 归档冷却期（天）
const ArchiveCooldownDays = 7

// MonthlyAllowance 每月豁免天数
const MonthlyAllowance = 2

type CreatePointReq struct {
	CategoryID   uint   `json:"category_id" binding:"required"`
	Name          string `json:"name" binding:"required,min=2,max=64"`
	IntentReason  string `json:"intent_reason" binding:"required,min=10"`
	Contract      string `json:"contract" binding:"required,min=4"`
	Measure       string `json:"measure" binding:"required,min=2"`
	TargetDays    int    `json:"target_days"`
}

// CreatePoint 意图门：创建复利点，进入 24h pending 冷静期
func CreatePoint(c *gin.Context) {
	var req CreatePointReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.TargetDays <= 0 {
		req.TargetDays = 100
	}

	// 聚焦上限：active + pending 总数不得超过上限
	var cnt int64
	if err := store.DB.Model(&model.Point{}).
		Where("status IN ?", []string{model.PointStatusActive, model.PointStatusPending}).
		Count(&cnt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if int(cnt) >= MaxActivePoints {
		c.JSON(http.StatusConflict, gin.H{
			"error":    "active 复利点已达上限（" + itoa(MaxActivePoints) + "），先归档一个再添加",
			"limit":    MaxActivePoints,
			"current":  cnt,
		})
		return
	}

	point := model.Point{
		CategoryID:   req.CategoryID,
		Name:         req.Name,
		IntentReason: req.IntentReason,
		Contract:      req.Contract,
		Measure:      req.Measure,
		TargetDays:   req.TargetDays,
		Status:       model.PointStatusPending,
	}
	if err := store.DB.Create(&point).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	expires := time.Now().Add(PendingQuietHours * time.Hour)
	ev := model.PointEvent{
		PointID:   point.ID,
		EventType: "create",
		Status:    "pending",
		ExpiresAt: &expires,
	}
	store.DB.Create(&ev)

	c.JSON(http.StatusCreated, point)
}

// ListPoints 复利点列表，支持 ?status= 过滤
func ListPoints(c *gin.Context) {
	status := c.Query("status")
	q := store.DB.Model(&model.Point{})
	if status != "" {
		q = q.Where("status = ?", status)
	} else {
		// 默认隐藏 archived，其余都显示
		q = q.Where("status != ?", model.PointStatusArchived)
	}
	var points []model.Point
	if err := q.Order("created_at DESC").Find(&points).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	c.JSON(http.StatusOK, points)
}

// ActivatePoint 冷静期满后手动确认激活
func ActivatePoint(c *gin.Context) {
	id := c.Param("id")
	var p model.Point
	if err := store.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if p.Status != model.PointStatusPending {
		c.JSON(http.StatusConflict, gin.H{"error": "仅 pending 状态可激活"})
		return
	}
	created := p.CreatedAt
	if time.Since(created) < PendingQuietHours*time.Hour {
		c.JSON(http.StatusConflict, gin.H{
			"error":       "冷静期未满 24 小时，冲动不是意图",
			"activate_at": created.Add(PendingQuietHours * time.Hour),
		})
		return
	}
	now := time.Now()
	p.Status = model.PointStatusActive
	p.ActivatedAt = &now
	if err := store.DB.Save(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	store.DB.Model(&model.PointEvent{}).Where("point_id = ? AND event_type = ?", p.ID, "create").
		Updates(map[string]interface{}{"status": "executed"})
	c.JSON(http.StatusOK, p)
}

type ArchiveReq struct {
	Reason string `json:"reason" binding:"required,min=10"`
	Cause  string `json:"cause" binding:"required,oneof=wrong_knowledge broken_execution"`
}

// RequestArchive 冷却期第一步：申请归档，必须填写原因与归因
func RequestArchive(c *gin.Context) {
	id := c.Param("id")
	var p model.Point
	if err := store.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if p.Status != model.PointStatusActive {
		c.JSON(http.StatusConflict, gin.H{"error": "仅 active 状态可申请归档"})
		return
	}
	var req ArchiveReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	p.Status = model.PointStatusArchiving
	p.ArchivedReason = req.Reason
	p.ArchivedCause = req.Cause
	p.ArchivedAt = &now
	if err := store.DB.Save(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	expires := now.AddDate(0, 0, ArchiveCooldownDays)
	store.DB.Create(&model.PointEvent{
		PointID:   p.ID,
		EventType: "archive_request",
		Reason:    req.Reason,
		Status:    "pending",
		ExpiresAt: &expires,
	})
	c.JSON(http.StatusOK, p)
}

// RestorePoint 冷却期内一键恢复
func RestorePoint(c *gin.Context) {
	id := c.Param("id")
	var p model.Point
	if err := store.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if p.Status != model.PointStatusArchiving {
		c.JSON(http.StatusConflict, gin.H{"error": "仅 archiving 状态可恢复"})
		return
	}
	p.Status = model.PointStatusActive
	p.ArchivedReason = ""
	p.ArchivedCause = ""
	p.ArchivedAt = nil
	if err := store.DB.Save(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	store.DB.Model(&model.PointEvent{}).Where("point_id = ? AND status = ?", p.ID, "pending").
		Updates(map[string]interface{}{"status": "executed"})
	c.JSON(http.StatusOK, p)
}

// ConfirmArchive 冷却期满后确认归档
func ConfirmArchive(c *gin.Context) {
	id := c.Param("id")
	var p model.Point
	if err := store.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if p.Status != model.PointStatusArchiving {
		c.JSON(http.StatusConflict, gin.H{"error": "仅 archiving 状态可确认"})
		return
	}
	if p.ArchivedAt != nil && time.Since(*p.ArchivedAt) < ArchiveCooldownDays*24*time.Hour {
		c.JSON(http.StatusConflict, gin.H{
			"error":      "冷却期未满 7 天",
			"confirm_at": p.ArchivedAt.AddDate(0, 0, ArchiveCooldownDays),
		})
		return
	}
	p.Status = model.PointStatusArchived
	if err := store.DB.Save(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	store.DB.Model(&model.PointEvent{}).Where("point_id = ? AND status = ?", p.ID, "pending").
		Updates(map[string]interface{}{"status": "executed"})
	c.JSON(http.StatusOK, p)
}

// itoa 简易整数转字符串（避免引入 strconv 只为一处）
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b []byte
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	return string(b)
}

// checkDateToday 返回当天日期字符串 YYYY-MM-DD（本地时区）
func checkDateToday() string {
	return time.Now().Format("2006-01-02")
}

var _ = errors.New
var _ = strings.TrimSpace
