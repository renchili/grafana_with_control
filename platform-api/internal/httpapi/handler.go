package httpapi

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/renchili/grafana_with_control/platform-api/internal/model"
	"github.com/renchili/grafana_with_control/platform-api/internal/store"
)

type Handler struct {
	store *store.MemoryStore
}

func NewHandler(s *store.MemoryStore) *Handler {
	return &Handler{store: s}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.GET("/healthz", h.healthz)
	r.GET("/me/drafts", h.listDrafts)
	r.POST("/drafts/:draftId/publish", h.publishDraft)
	r.POST("/drafts/:draftId/abandon", h.abandonDraft)
	r.GET("/drafts/:draftId/conflict", h.getConflict)
	r.POST("/drafts/:draftId/rebase", h.rebaseDraft)
	r.POST("/drafts/:draftId/save-as-copy", h.saveAsCopy)
	r.POST("/drafts/:draftId/takeover", h.takeoverDraft)
}

func (h *Handler) healthz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) listDrafts(c *gin.Context) {
	c.JSON(http.StatusOK, h.store.ListDrafts())
}

func (h *Handler) publishDraft(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok {
		return
	}
	resp, found := h.store.PublishDraft(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "draft not found"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) abandonDraft(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok {
		return
	}
	resp, found := h.store.AbandonDraft(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "draft not found"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) getConflict(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok {
		return
	}
	payload, found := h.store.GetConflict(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "conflict data not found"})
		return
	}
	c.JSON(http.StatusOK, payload)
}

func (h *Handler) rebaseDraft(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok {
		return
	}
	resp, found := h.store.RebaseDraft(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "draft not found"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) saveAsCopy(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok {
		return
	}
	var req model.SaveAsCopyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	resp, found := h.store.SaveAsCopy(id, req)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "draft not found"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) takeoverDraft(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok {
		return
	}
	resp, found := h.store.TakeoverDraft(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "draft not found"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func parseDraftID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("draftId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid draftId"})
		return 0, false
	}
	return id, true
}
