package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/linc-he/Life-compounding-os/backend/internal/store"
)

func TestAppStatePersistsInSQLite(t *testing.T) {
	previousDB := store.DB
	t.Cleanup(func() { store.DB = previousDB })
	dbPath := filepath.Join(t.TempDir(), "life.db")
	if err := store.Init(dbPath); err != nil {
		t.Fatalf("initialize SQLite: %v", err)
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/app-state", GetAppState)
	router.PUT("/api/app-state", PutAppState)

	get := httptest.NewRecorder()
	router.ServeHTTP(get, httptest.NewRequest(http.MethodGet, "/api/app-state", nil))
	if get.Code != http.StatusOK || !strings.Contains(get.Body.String(), `"state":null`) {
		t.Fatalf("expected empty initial state response, got %d %s", get.Code, get.Body.String())
	}

	payload := `{"state":{"version":3,"categories":[],"items":[],"checkIns":{},"changeLogs":[]}}`
	put := httptest.NewRecorder()
	router.ServeHTTP(put, httptest.NewRequest(http.MethodPut, "/api/app-state", strings.NewReader(payload)))
	if put.Code != http.StatusOK {
		t.Fatalf("save app state: got %d %s", put.Code, put.Body.String())
	}

	// Reopen the same file to prove the API is backed by durable SQLite, not process memory.
	if err := store.Init(dbPath); err != nil {
		t.Fatalf("reopen SQLite: %v", err)
	}
	restored := httptest.NewRecorder()
	router.ServeHTTP(restored, httptest.NewRequest(http.MethodGet, "/api/app-state", nil))
	if restored.Code != http.StatusOK {
		t.Fatalf("read saved app state: got %d %s", restored.Code, restored.Body.String())
	}
	var response struct {
		State json.RawMessage `json:"state"`
	}
	if err := json.Unmarshal(restored.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode restored state: %v", err)
	}
	if string(response.State) != `{"version":3,"categories":[],"items":[],"checkIns":{},"changeLogs":[]}` {
		t.Fatalf("unexpected restored payload: %s", response.State)
	}

	invalid := httptest.NewRecorder()
	router.ServeHTTP(invalid, httptest.NewRequest(http.MethodPut, "/api/app-state", strings.NewReader(`{"state":{"version":3}}`)))
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid state to be rejected, got %d", invalid.Code)
	}
}
