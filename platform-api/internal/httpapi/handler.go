package httpapi

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/renchili/grafana_with_control/platform-api/internal/model"
	"github.com/renchili/grafana_with_control/platform-api/internal/store"
)

type Handler struct {
	store                 *store.MemoryStore
	syntheticMu           sync.RWMutex
	syntheticDrafts       map[int64]model.Draft
	syntheticDraftPayload map[int64]map[string]any
	nextSyntheticDraftID  int64
}

func NewHandler(s *store.MemoryStore) *Handler {
	return &Handler{
		store:                 s,
		syntheticDrafts:       map[int64]model.Draft{},
		syntheticDraftPayload: map[int64]map[string]any{},
		nextSyntheticDraftID:  10000,
	}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.GET("/healthz", h.healthz)
	r.GET("/me/drafts", h.listDrafts)
	r.GET("/resources/:uid", h.getResourceDefinition)
	r.POST("/resources/:uid/drafts", h.createDraftForResource)
	r.GET("/drafts/:draftId", h.getDraftDetail)
	r.POST("/drafts/:draftId/save", h.saveDraft)
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

func (h *Handler) getResourceDefinition(c *gin.Context) {
	uid := c.Param("uid")
	draft, found := h.findDraftByUID(uid)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "resource not found"})
		return
	}
	c.JSON(http.StatusOK, buildResourceDefinition(draft))
}

func (h *Handler) createDraftForResource(c *gin.Context) {
	uid := c.Param("uid")
	if existing, found := h.findDraftByUID(uid); found {
		c.JSON(http.StatusOK, gin.H{"draftId": existing.DraftID})
		return
	}

	h.syntheticMu.Lock()
	defer h.syntheticMu.Unlock()

	h.nextSyntheticDraftID++
	draft := model.Draft{
		DraftID:        h.nextSyntheticDraftID,
		ResourceType:   "dashboard",
		ResourceUID:    uid,
		Title:          "Governed Draft for " + uid,
		OwnerName:      "platform-demo",
		BaseVersionNo:  1,
		GovernanceMode: "platform",
		Status:         model.DraftStatusActive,
		UpdatedAt:      time.Now().UTC().Format(time.RFC3339),
	}
	h.syntheticDrafts[draft.DraftID] = draft
	h.syntheticDraftPayload[draft.DraftID] = defaultDraftPayload(draft)
	c.JSON(http.StatusOK, gin.H{"draftId": draft.DraftID})
}

func (h *Handler) getDraftDetail(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok {
		return
	}
	draft, found := h.findDraftByID(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "draft not found"})
		return
	}
	c.JSON(http.StatusOK, buildDraftDetail(draft, h.syntheticPayloadOrDefault(draft)))
}

func (h *Handler) saveDraft(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok {
		return
	}
	draft, found := h.findDraftByID(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "draft not found"})
		return
	}

	var payload map[string]any
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
			return
		}
	}

	h.saveSyntheticPayload(id, draft, payload)
	updatedDraft, _ := h.findDraftByID(id)
	c.JSON(http.StatusOK, buildDraftDetail(updatedDraft, h.syntheticPayloadOrDefault(updatedDraft)))
}

func (h *Handler) publishDraft(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok {
		return
	}
	if h.setSyntheticDraftStatus(id, model.DraftStatusPublished) {
		c.JSON(http.StatusOK, model.ActionResponse{Success: true, Message: "draft published", JobID: id})
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
	if h.setSyntheticDraftStatus(id, model.DraftStatusAbandoned) {
		c.JSON(http.StatusOK, model.ActionResponse{Success: true, Message: "draft abandoned"})
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
	if draft, found := h.getSyntheticDraft(id); found {
		payload := model.ConflictPayload{
			DraftID:          draft.DraftID,
			ResourceUID:      draft.ResourceUID,
			ResourceType:     draft.ResourceType,
			BaseVersionNo:    draft.BaseVersionNo,
			CurrentVersionNo: draft.BaseVersionNo,
			HasConflict:      false,
			ConflictPaths:    []string{},
			Base:             map[string]any{"title": draft.Title},
			Yours:            h.syntheticPayloadOrDefault(draft),
			Theirs:           map[string]any{"title": draft.Title},
		}
		c.JSON(http.StatusOK, payload)
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
	if h.touchSyntheticDraft(id) {
		c.JSON(http.StatusOK, model.ActionResponse{Success: true, Message: "draft rebased"})
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
	if draft, found := h.getSyntheticDraft(id); found {
		h.syntheticMu.Lock()
		h.nextSyntheticDraftID++
		copyDraft := draft
		copyDraft.DraftID = h.nextSyntheticDraftID
		if req.Title != "" {
			copyDraft.Title = req.Title
		}
		if req.UID != "" {
			copyDraft.ResourceUID = req.UID
		}
		copyDraft.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		h.syntheticDrafts[copyDraft.DraftID] = copyDraft
		basePayload := h.syntheticDraftPayload[id]
		if basePayload == nil {
			basePayload = defaultDraftPayload(copyDraft)
		}
		h.syntheticDraftPayload[copyDraft.DraftID] = cloneMap(basePayload)
		h.syntheticMu.Unlock()
		c.JSON(http.StatusOK, model.ActionResponse{Success: true, Message: "draft copied", NewResourceUID: copyDraft.ResourceUID})
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
	if h.touchSyntheticDraft(id) {
		c.JSON(http.StatusOK, model.ActionResponse{Success: true, Message: "draft takeover accepted"})
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

func (h *Handler) findDraftByUID(uid string) (model.Draft, bool) {
	for _, draft := range h.store.ListDrafts() {
		if draft.ResourceUID == uid {
			return draft, true
		}
	}

	h.syntheticMu.RLock()
	defer h.syntheticMu.RUnlock()
	for _, draft := range h.syntheticDrafts {
		if draft.ResourceUID == uid {
			return draft, true
		}
	}
	return model.Draft{}, false
}

func (h *Handler) findDraftByID(id int64) (model.Draft, bool) {
	for _, draft := range h.store.ListDrafts() {
		if draft.DraftID == id {
			return draft, true
		}
	}
	return h.getSyntheticDraft(id)
}

func (h *Handler) getSyntheticDraft(id int64) (model.Draft, bool) {
	h.syntheticMu.RLock()
	defer h.syntheticMu.RUnlock()
	draft, found := h.syntheticDrafts[id]
	return draft, found
}

func (h *Handler) touchSyntheticDraft(id int64) bool {
	h.syntheticMu.Lock()
	defer h.syntheticMu.Unlock()
	draft, found := h.syntheticDrafts[id]
	if !found {
		return false
	}
	draft.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	h.syntheticDrafts[id] = draft
	return true
}

func (h *Handler) setSyntheticDraftStatus(id int64, status model.DraftStatus) bool {
	h.syntheticMu.Lock()
	defer h.syntheticMu.Unlock()
	draft, found := h.syntheticDrafts[id]
	if !found {
		return false
	}
	draft.Status = status
	draft.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	h.syntheticDrafts[id] = draft
	return true
}

func (h *Handler) saveSyntheticPayload(id int64, draft model.Draft, payload map[string]any) {
	h.syntheticMu.Lock()
	defer h.syntheticMu.Unlock()
	if _, found := h.syntheticDrafts[id]; !found {
		return
	}
	if payload == nil {
		payload = defaultDraftPayload(draft)
	}
	h.syntheticDraftPayload[id] = payload
	updated := h.syntheticDrafts[id]
	if title, ok := payload["title"].(string); ok && title != "" {
		updated.Title = title
	}
	updated.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	h.syntheticDrafts[id] = updated
}

func (h *Handler) syntheticPayloadOrDefault(draft model.Draft) map[string]any {
	h.syntheticMu.RLock()
	payload, found := h.syntheticDraftPayload[draft.DraftID]
	h.syntheticMu.RUnlock()
	if found && payload != nil {
		return cloneMap(payload)
	}
	return defaultDraftPayload(draft)
}

func defaultDraftPayload(draft model.Draft) map[string]any {
	return map[string]any{
		"title": draft.Title,
		"resourceUid": draft.ResourceUID,
		"governanceMode": draft.GovernanceMode,
		"panels": buildPanelsForDraft(draft),
	}
}

func buildResourceDefinition(draft model.Draft) model.ResourceDefinition {
	return model.ResourceDefinition{
		UID:                draft.ResourceUID,
		Title:              draft.Title,
		OwnerName:          draft.OwnerName,
		GovernanceMode:     draft.GovernanceMode,
		PublishedVersionNo: draft.BaseVersionNo,
		HasDraft:           true,
		DraftID:            draft.DraftID,
		Panels:             buildPanelsForDraft(draft),
	}
}

func buildDraftDetail(draft model.Draft, rawDraft map[string]any) model.DraftDetail {
	panels := buildPanelsForDraft(draft)
	if rawPanels, ok := rawDraft["panels"].([]any); ok {
		panels = panelDefinitionsFromAny(rawPanels, panels)
	}
	return model.DraftDetail{
		DraftID:        draft.DraftID,
		ResourceUID:    draft.ResourceUID,
		Title:          draft.Title,
		OwnerName:      draft.OwnerName,
		Status:         draft.Status,
		BaseVersionNo:  draft.BaseVersionNo,
		GovernanceMode: draft.GovernanceMode,
		Panels:         panels,
		RawDraft:       rawDraft,
	}
}

func buildPanelsForDraft(draft model.Draft) []model.PanelDefinition {
	panelOneRaw := map[string]any{
		"id": 1,
		"title": draft.Title + " / latency",
		"type": "timeseries",
		"targets": []map[string]any{{
			"refId": "A",
			"datasource": map[string]any{"type": "prometheus", "uid": "grafana"},
			"expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{dashboard_uid=\"" + draft.ResourceUID + "\"}[5m])) by (le))",
		}},
		"fieldConfig": map[string]any{
			"defaults": map[string]any{
				"unit": "s",
				"thresholds": map[string]any{
					"mode": "absolute",
					"steps": []map[string]any{{"color": "green", "value": nil}, {"color": "red", "value": 1.5}},
				},
			},
		},
	}

	panelTwoRaw := map[string]any{
		"id": 2,
		"title": draft.Title + " / deploy audit",
		"type": "table",
		"targets": []map[string]any{{
			"refId": "A",
			"datasource": map[string]any{"type": "mysql", "uid": "grafana"},
			"rawSql": "select updated_at, status, owner from governed_drafts where resource_uid = '" + draft.ResourceUID + "' order by updated_at desc limit 20",
		}},
		"transformations": []map[string]any{{
			"id": "organize",
			"options": map[string]any{"renameByName": map[string]any{"updated_at": "updatedAt"}},
		}},
	}

	return []model.PanelDefinition{
		{
			ID:         1,
			Title:      draft.Title + " / latency",
			Type:       "timeseries",
			Datasource: "prometheus",
			Queries: []model.QueryDefinition{{
				RefID:      "A",
				Datasource: "prometheus",
				Expression: "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{dashboard_uid=\"" + draft.ResourceUID + "\"}[5m])) by (le))",
			}},
			Transformations: []map[string]any{},
			FieldConfig: map[string]any{
				"defaults": map[string]any{"unit": "s"},
			},
			Options:  map[string]any{"legend": map[string]any{"displayMode": "list"}},
			RawModel: panelOneRaw,
		},
		{
			ID:         2,
			Title:      draft.Title + " / deploy audit",
			Type:       "table",
			Datasource: "mysql",
			Queries: []model.QueryDefinition{{
				RefID:      "A",
				Datasource: "mysql",
				Expression: "select updated_at, status, owner from governed_drafts where resource_uid = '" + draft.ResourceUID + "' order by updated_at desc limit 20",
			}},
			Transformations: []map[string]any{{
				"id": "organize",
				"options": map[string]any{"renameByName": map[string]any{"updated_at": "updatedAt"}},
			}},
			FieldConfig: map[string]any{
				"defaults": map[string]any{"custom": map[string]any{"align": "auto"}},
			},
			Options:  map[string]any{"showHeader": true},
			RawModel: panelTwoRaw,
		},
	}
}

func panelDefinitionsFromAny(rawPanels []any, fallback []model.PanelDefinition) []model.PanelDefinition {
	panels := make([]model.PanelDefinition, 0, len(rawPanels))
	for index, item := range rawPanels {
		panelMap, ok := item.(map[string]any)
		if !ok {
			continue
		}
		panel := model.PanelDefinition{}
		if value, ok := panelMap["id"].(float64); ok {
			panel.ID = int64(value)
		} else if index < len(fallback) {
			panel.ID = fallback[index].ID
		}
		if value, ok := panelMap["title"].(string); ok {
			panel.Title = value
		} else if index < len(fallback) {
			panel.Title = fallback[index].Title
		}
		if value, ok := panelMap["type"].(string); ok {
			panel.Type = value
		} else if index < len(fallback) {
			panel.Type = fallback[index].Type
		}
		if value, ok := panelMap["datasource"].(string); ok {
			panel.Datasource = value
		} else if index < len(fallback) {
			panel.Datasource = fallback[index].Datasource
		}
		if value, ok := panelMap["fieldConfig"].(map[string]any); ok {
			panel.FieldConfig = value
		} else if index < len(fallback) {
			panel.FieldConfig = fallback[index].FieldConfig
		}
		if value, ok := panelMap["options"].(map[string]any); ok {
			panel.Options = value
		} else if index < len(fallback) {
			panel.Options = fallback[index].Options
		}
		if value, ok := panelMap["rawModel"].(map[string]any); ok {
			panel.RawModel = value
		} else {
			panel.RawModel = cloneMap(panelMap)
		}
		if rawQueries, ok := panelMap["queries"].([]any); ok {
			panel.Queries = make([]model.QueryDefinition, 0, len(rawQueries))
			for _, rawQuery := range rawQueries {
				queryMap, ok := rawQuery.(map[string]any)
				if !ok {
					continue
				}
				query := model.QueryDefinition{}
				if value, ok := queryMap["refId"].(string); ok {
					query.RefID = value
				}
				if value, ok := queryMap["datasource"].(string); ok {
					query.Datasource = value
				}
				if value, ok := queryMap["expression"].(string); ok {
					query.Expression = value
				}
				panel.Queries = append(panel.Queries, query)
			}
		} else if index < len(fallback) {
			panel.Queries = fallback[index].Queries
		}
		if rawTransforms, ok := panelMap["transformations"].([]any); ok {
			panel.Transformations = make([]map[string]any, 0, len(rawTransforms))
			for _, rawTransform := range rawTransforms {
				transformMap, ok := rawTransform.(map[string]any)
				if ok {
					panel.Transformations = append(panel.Transformations, transformMap)
				}
			}
		} else if index < len(fallback) {
			panel.Transformations = fallback[index].Transformations
		}
		panels = append(panels, panel)
	}
	if len(panels) == 0 {
		return fallback
	}
	return panels
}

func cloneMap(input map[string]any) map[string]any {
	output := make(map[string]any, len(input))
	for key, value := range input {
		output[key] = value
	}
	return output
}
