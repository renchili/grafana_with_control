package server

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/renchili/grafana_with_control/platform-api/internal/httpapi"
	"github.com/renchili/grafana_with_control/platform-api/internal/store"
)

func New() *gin.Engine {
	r := gin.Default()
	var s store.Store
	if os.Getenv("DATABASE_DSN") != "" {
		mysqlStore, err := store.NewMySQLStoreFromEnv()
		if err != nil {
			log.Printf("failed to init mysql store, fallback memory: %v", err)
			s = store.NewMemoryStore()
		} else {
			log.Printf("using mysql store")
			s = mysqlStore
		}
	} else {
		s = store.NewMemoryStore()
	}

	h := httpapi.NewHandler(s)
	api := r.Group("/api/platform/v1")
	h.Register(api)
	return r
}
