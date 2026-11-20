package handler

import (
	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/linc-he/Life-compounding-os/backend/internal/store"
)

type appStateRequest struct {
	State json.RawMessage `json:"state" binding:"required"`
}

// GetAppState returns the persisted React app state, or null before first use.
func GetAppState(c *gin.Context) {
	snapshot, err := store.LoadAppState()
	if err != nil {
		c.JSON(500, gin.H{"error": "读取 SQLite 状态失败"})
		return
	}
	if snapshot == nil {
		c.JSON(200, gin.H{"state": nil})
		return
	}
	var state json.RawMessage = json.RawMessage(snapshot.Payload)
	c.JSON(200, gin.H{"state": state, "updated_at": snapshot.UpdatedAt})
}

// PutAppState validates and atomically saves the full current app state.
func PutAppState(c *gin.Context) {
	var request appStateRequest
	if err := c.ShouldBindJSON(&request); err != nil || len(request.State) == 0 || string(request.State) == "null" {
		c.JSON(400, gin.H{"error": "需要提供有效的 state 对象"})
		return
	}
	var state struct {
		Version    int                        `json:"version"`
		Categories []json.RawMessage          `json:"categories"`
		Items      []json.RawMessage          `json:"items"`
		CheckIns   map[string]json.RawMessage `json:"checkIns"`
		ChangeLogs []json.RawMessage          `json:"changeLogs"`
	}
	if err := json.Unmarshal(request.State, &state); err != nil || state.Categories == nil || state.Items == nil || state.CheckIns == nil || state.ChangeLogs == nil {
		c.JSON(400, gin.H{"error": "state 结构无效"})
		return
	}
	if err := store.SaveAppState(string(request.State)); err != nil {
		c.JSON(500, gin.H{"error": "写入 SQLite 状态失败"})
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
