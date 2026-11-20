package model

import "time"

// Category 复利分类：学习 / 投资 / 生活习惯
type Category struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:32;uniqueIndex" json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

// Point 复利点。
// 状态机: pending -> active -> archiving -> archived
//   pending: 提交后 24h 冷静期，需手动确认激活
//   active: 参与每日对照
//   archiving: 归档冷却中（7 天），可恢复
//   archived: 已确认放弃，永不物理删除
type Point struct {
	ID             uint   `gorm:"primaryKey" json:"id"`
	CategoryID     uint   `gorm:"not null" json:"category_id"`
	Name           string `gorm:"size:64;not null" json:"name"`
	IntentReason   string `gorm:"not null" json:"intent_reason"`   // 意图四问之一：为什么加这个点
	Contract       string `gorm:"not null" json:"contract"`        // 最低契约：低到不会失败的日常目标
	Measure        string `gorm:"not null" json:"measure"`         // 领先指标
	TargetDays     int    `gorm:"default:100" json:"target_days"`
	Status         string `gorm:"size:16;default:pending;index" json:"status"`
	ArchivedReason string `json:"archived_reason,omitempty"`
	ArchivedCause  string `gorm:"size:16" json:"archived_cause,omitempty"` // wrong_knowledge / broken_execution
	ActivatedAt    *time.Time `json:"activated_at,omitempty"`
	ArchivedAt     *time.Time `json:"archived_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// 状态常量
const (
	PointStatusPending   = "pending"
	PointStatusActive    = "active"
	PointStatusArchiving = "archiving"
	PointStatusArchived  = "archived"
)

// 归因常量
const (
	ArchivedCauseWrongKnowledge = "wrong_knowledge"     // 知错了
	ArchivedCauseBrokenExec     = "broken_execution"    // 行断了
)

// DailyCheck 每日对照评分，每个复利点每天最多一条
type DailyCheck struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	PointID   uint   `gorm:"not null;uniqueIndex:idx_point_date" json:"point_id"`
	CheckDate string `gorm:"size:10;not null;uniqueIndex:idx_point_date" json:"check_date"` // "2026-11-20"
	Score     int    `gorm:"not null" json:"score"`                                       // 0-5
	Note      string `json:"note,omitempty"`                                              // 知行校验备注
	UsedAllowance bool `gorm:"default:false" json:"used_allowance"`                        // 是否使用月豁免
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// PointEvent 意图门与冷却期的审计日志
type PointEvent struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PointID   uint      `gorm:"not null;index" json:"point_id"`
	EventType string    `gorm:"size:32;not null" json:"event_type"` // create / activate / archive_request / restore / confirm_archive
	Reason    string    `json:"reason,omitempty"`
	Status    string    `gorm:"size:16;default:pending" json:"status"` // pending / executed / expired
	ExpiresAt *time.Time `json:"expires_at,omitempty"`                  // 冷静期/冷却期截止
	CreatedAt time.Time `json:"created_at"`
}

// Review 周/月复盘
type Review struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Kind        string `gorm:"size:8;not null" json:"kind"`  // weekly / monthly
	PeriodStart string `gorm:"size:10;not null" json:"period_start"`
	PeriodEnd   string `gorm:"size:10;not null" json:"period_end"`
	Validated   string `json:"validated,omitempty"`  // 本周验证了什么知
	Overturned  string `json:"overturned,omitempty"` // 推翻了什么知
	NextExperiment string `json:"next_experiment,omitempty"` // 下周唯一实验
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
