package store

import (
	"errors"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/linc-he/Life-compounding-os/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// DB 全局数据库句柄
var DB *gorm.DB

// Init 打开（必要时创建）SQLite 数据库并自动迁移所有表
func Init(dbPath string) error {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return err
	}
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return err
	}
	if err := db.AutoMigrate(
		&model.Category{},
		&model.Point{},
		&model.DailyCheck{},
		&model.PointEvent{},
		&model.Review{},
		&model.AppStateSnapshot{},
	); err != nil {
		return err
	}
	DB = db
	log.Printf("sqlite ready: %s", dbPath)
	return nil
}

// SeedCategories 预置三个复利分类（幂等）
func SeedCategories() error {
	cats := []model.Category{
		{Name: "学习"}, {Name: "投资"}, {Name: "生活习惯"},
	}
	for _, c := range cats {
		var cnt int64
		store := DB.Model(&model.Category{}).Where("name = ?", c.Name).Count(&cnt)
		if store.Error != nil {
			return store.Error
		}
		if cnt == 0 {
			if err := DB.Create(&c).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

// LoadAppState returns the current app state snapshot, if one has been saved.
func LoadAppState() (*model.AppStateSnapshot, error) {
	var snapshot model.AppStateSnapshot
	err := DB.First(&snapshot, 1).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &snapshot, nil
}

// SaveAppState atomically replaces the single snapshot row (id=1).
func SaveAppState(payload string) error {
	snapshot := model.AppStateSnapshot{ID: 1, Payload: payload, UpdatedAt: time.Now().UTC()}
	return DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"payload", "updated_at"}),
	}).Create(&snapshot).Error
}
