package server

import (
	"github.com/gin-gonic/gin"
	"github.com/renchili/grafana_with_control/platform-api/internal/httpapi"
	"github.com/renchili/grafana_with_control/platform-api/internal/store"
)

func New() *gin.Engine {
	r := gin.Default()
	s := store.NewMemoryStore()
	h := httpapi.NewHandler(s)
	api := r.Group("/api/platform/v1")
	h.Register(api)
	return r
}
