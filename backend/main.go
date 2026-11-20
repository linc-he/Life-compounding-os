package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/linc-he/Life-compounding-os/backend/internal/handler"
	"github.com/linc-he/Life-compounding-os/backend/internal/store"
)

func main() {
	if err := store.Init("./data/life.db"); err != nil {
		log.Fatalf("init db: %v", err)
	}
	if err := store.SeedCategories(); err != nil {
		log.Fatalf("seed: %v", err)
	}

	r := gin.Default()
	r.Use(cors.Default())

	api := r.Group("/api")
	{
		// 今日对照
		api.GET("/today", handler.GetToday)
		api.POST("/checks", handler.SubmitCheck)

		// 复利点管理（意图门 + 冷却期）
		api.GET("/points", handler.ListPoints)
		api.POST("/points", handler.CreatePoint)
		api.POST("/points/:id/activate", handler.ActivatePoint)
		api.POST("/points/:id/archive", handler.RequestArchive)
		api.POST("/points/:id/restore", handler.RestorePoint)
		api.POST("/points/:id/confirm-archive", handler.ConfirmArchive)

		// 分类与审计
		api.GET("/categories", handler.ListCategories)
		api.GET("/events", handler.ListEvents)

		// 复盘
		api.POST("/reviews", handler.UpsertReview)
		api.GET("/reviews", handler.ListReviews)
	}

	log.Println("Life Compounding OS listening on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
