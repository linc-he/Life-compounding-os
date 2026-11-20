package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/linc-he/Life-compounding-os/backend/internal/model"
	"github.com/linc-he/Life-compounding-os/backend/internal/store"
)

// ListCategories 复利分类列表
func ListCategories(c *gin.Context) {
	var cats []model.Category
	if err := store.DB.Order("id ASC").Find(&cats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	c.JSON(http.StatusOK, cats)
}

// ListEvents 复利点事件流（审计日志）：?point_id= 过滤
func ListEvents(c *gin.Context) {
	q := store.DB.Model(&model.PointEvent{}).Order("created_at DESC").Limit(200)
	if pid := c.Query("point_id"); pid != "" {
		q = q.Where("point_id = ?", pid)
	}
	var events []model.PointEvent
	if err := q.Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	c.JSON(http.StatusOK, events)
}

type ReviewReq struct {
	Kind           string `json:"kind" binding:"required,oneof=weekly monthly"`
	PeriodStart    string `json:"period_start" binding:"required,len=10"`
	PeriodEnd      string `json:"period_end" binding:"required,len=10"`
	Validated      string `json:"validated"`
	Overturned     string `json:"overturned"`
	NextExperiment string `json:"next_experiment"`
}

// UpsertReview 创建或更新复盘（同 kind+period 幂等）
func UpsertReview(c *gin.Context) {
	var req ReviewReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var r model.Review
	err := store.DB.Where("kind = ? AND period_start = ?", req.Kind, req.PeriodStart).
		First(&r).Error
	if err == nil {
		r.PeriodEnd = req.PeriodEnd
		r.Validated = req.Validated
		r.Overturned = req.Overturned
		r.NextExperiment = req.NextExperiment
		store.DB.Save(&r)
		c.JSON(http.StatusOK, r)
		return
	}
	r = model.Review{
		Kind:           req.Kind,
		PeriodStart:    req.PeriodStart,
		PeriodEnd:      req.PeriodEnd,
		Validated:      req.Validated,
		Overturned:     req.Overturned,
		NextExperiment:  req.NextExperiment,
	}
	if err := store.DB.Create(&r).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	c.JSON(http.StatusCreated, r)
}

// ListReviews 复盘列表：?kind=weekly|monthly 过滤
func ListReviews(c *gin.Context) {
	q := store.DB.Model(&model.Review{}).Order("period_start DESC").Limit(100)
	if kind := c.Query("kind"); kind != "" {
		q = q.Where("kind = ?", kind)
	}
	var reviews []model.Review
	if err := q.Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	c.JSON(http.StatusOK, reviews)
}
