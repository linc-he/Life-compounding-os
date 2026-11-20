package store

import (
	"log"
	"os"
	"path/filepath"

	"github.com/linc-he/Life-compounding-os/backend/internal/model"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
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
