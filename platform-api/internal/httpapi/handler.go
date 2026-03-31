package httpapi

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/renchili/grafana_with_control/platform-api/internal/model"
	"github.com/renchili/grafana_with_control/platform-api/internal/store"
)

type Handler struct { store store.Store }

func NewHandler(s store.Store) *Handler { return &Handler{store: s} }

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

func (h *Handler) healthz(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) }
func (h *Handler) listDrafts(c *gin.Context) { c.JSON(http.StatusOK, h.store.ListDrafts()) }

func (h *Handler) getResourceDefinition(c *gin.Context) {
	uid := c.Param("uid")

	if storeWithPublished, ok := h.store.(interface {
		GetResourceDefinitionByUID(uid string) (model.Draft, map[string]any, bool)
	}); ok {
		draft, payload, found := storeWithPublished.GetResourceDefinitionByUID(uid)
		if !found {
			c.JSON(http.StatusNotFound, gin.H{"message": "resource not found"})
			return
		}
		if payload == nil {
			payload = defaultDraftPayloadForHandler(draft)
		}
		c.JSON(http.StatusOK, buildDraftDetail(draft, payload))
		return
	}

	draft, found := h.store.GetDraftByUID(uid)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "resource not found"})
		return
	}
	c.JSON(http.StatusOK, buildResourceDefinition(draft))
}

func (h *Handler) createDraftForResource(c *gin.Context) {
	uid := c.Param("uid")
	draft, err := h.store.CreateDraft(uid, defaultDraftPayloadForHandler(model.Draft{ResourceUID: uid, Title: "Governed Draft for " + uid, GovernanceMode: "platform"}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"draftId": draft.DraftID})
}

func (h *Handler) getDraftDetail(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok { return }
	draft, found := h.store.GetDraft(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "draft not found"})
		return
	}
	payload, _ := h.store.GetDraftPayload(id)
	if payload == nil { payload = defaultDraftPayloadForHandler(draft) }
	c.JSON(http.StatusOK, buildDraftDetail(draft, payload))
}

func (h *Handler) saveDraft(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok { return }
	var payload map[string]any
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
			return
		}
	}
	draft, savedPayload, err := h.store.SaveDraftPayload(id, payload)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, buildDraftDetail(draft, savedPayload))
}

func (h *Handler) publishDraft(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok { return }
	draft, found := h.store.GetDraft(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "draft not found"})
		return
	}
	payload, _ := h.store.GetDraftPayload(id)
	if payload == nil { payload = defaultDraftPayloadForHandler(draft) }
	if err := publishDraftToGrafana(draft, payload); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": err.Error()})
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
	if !ok { return }
	resp, found := h.store.AbandonDraft(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "draft not found"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) getConflict(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok { return }
	payload, found := h.store.GetConflict(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "conflict data not found"})
		return
	}
	c.JSON(http.StatusOK, payload)
}

func (h *Handler) rebaseDraft(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok { return }
	resp, found := h.store.RebaseDraft(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "draft not found"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) saveAsCopy(c *gin.Context) {
	id, ok := parseDraftID(c)
	if !ok { return }
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
	if !ok { return }
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

func defaultDraftPayloadForHandler(draft model.Draft) map[string]any {
	return map[string]any{
		"title": draft.Title,
		"resourceUid": draft.ResourceUID,
		"governanceMode": draft.GovernanceMode,
		"panels": buildPanelsForDraft(draft),
	}
}

func buildResourceDefinition(draft model.Draft) model.ResourceDefinition {
	return model.ResourceDefinition{UID: draft.ResourceUID, Title: draft.Title, OwnerName: draft.OwnerName, GovernanceMode: draft.GovernanceMode, PublishedVersionNo: draft.BaseVersionNo, HasDraft: true, DraftID: draft.DraftID, Panels: buildPanelsForDraft(draft)}
}

func buildDraftDetail(draft model.Draft, rawDraft map[string]any) model.DraftDetail {
	panels := buildPanelsForDraft(draft)
	if rawPanels, ok := rawDraft["panels"].([]any); ok { panels = panelDefinitionsFromAny(rawPanels, panels) }
	return model.DraftDetail{DraftID: draft.DraftID, ResourceUID: draft.ResourceUID, Title: draft.Title, OwnerName: draft.OwnerName, Status: draft.Status, BaseVersionNo: draft.BaseVersionNo, GovernanceMode: draft.GovernanceMode, Panels: panels, RawDraft: rawDraft}
}

func buildPanelsForDraft(draft model.Draft) []model.PanelDefinition {
	panelOneRaw := map[string]any{"id": 1, "title": draft.Title + " / latency", "type": "timeseries", "targets": []map[string]any{{"refId": "A", "datasource": map[string]any{"type": "prometheus", "uid": "grafana"}, "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{dashboard_uid=\"" + draft.ResourceUID + "\"}[5m])) by (le))"}}, "fieldConfig": map[string]any{"defaults": map[string]any{"unit": "s", "thresholds": map[string]any{"mode": "absolute", "steps": []map[string]any{{"color": "green", "value": nil}, {"color": "red", "value": 1.5}}}}}}
	panelTwoRaw := map[string]any{"id": 2, "title": draft.Title + " / deploy audit", "type": "table", "targets": []map[string]any{{"refId": "A", "datasource": map[string]any{"type": "mysql", "uid": "grafana"}, "rawSql": "select updated_at, status, owner from governed_drafts where resource_uid = '" + draft.ResourceUID + "' order by updated_at desc limit 20"}}, "transformations": []map[string]any{{"id": "organize", "options": map[string]any{"renameByName": map[string]any{"updated_at": "updatedAt"}}}}}
	return []model.PanelDefinition{{ID: 1, Title: draft.Title + " / latency", Type: "timeseries", Datasource: "prometheus", Queries: []model.QueryDefinition{{RefID: "A", Datasource: "prometheus", Expression: "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{dashboard_uid=\"" + draft.ResourceUID + "\"}[5m])) by (le))"}}, Transformations: []map[string]any{}, FieldConfig: map[string]any{"defaults": map[string]any{"unit": "s"}}, Options: map[string]any{"legend": map[string]any{"displayMode": "list"}}, RawModel: panelOneRaw}, {ID: 2, Title: draft.Title + " / deploy audit", Type: "table", Datasource: "mysql", Queries: []model.QueryDefinition{{RefID: "A", Datasource: "mysql", Expression: "select updated_at, status, owner from governed_drafts where resource_uid = '" + draft.ResourceUID + "' order by updated_at desc limit 20"}}, Transformations: []map[string]any{{"id": "organize", "options": map[string]any{"renameByName": map[string]any{"updated_at": "updatedAt"}}}}, FieldConfig: map[string]any{"defaults": map[string]any{"custom": map[string]any{"align": "auto"}}}, Options: map[string]any{"showHeader": true}, RawModel: panelTwoRaw}}
}

func panelDefinitionsFromAny(rawPanels []any, fallback []model.PanelDefinition) []model.PanelDefinition {
	panels := make([]model.PanelDefinition, 0, len(rawPanels))
	for index, item := range rawPanels {
		panelMap, ok := item.(map[string]any)
		if !ok { continue }
		panel := model.PanelDefinition{}
		if value, ok := panelMap["id"].(float64); ok { panel.ID = int64(value) } else if index < len(fallback) { panel.ID = fallback[index].ID }
		if value, ok := panelMap["title"].(string); ok { panel.Title = value } else if index < len(fallback) { panel.Title = fallback[index].Title }
		if value, ok := panelMap["type"].(string); ok { panel.Type = value } else if index < len(fallback) { panel.Type = fallback[index].Type }
		if value, ok := panelMap["datasource"].(string); ok { panel.Datasource = value } else if index < len(fallback) { panel.Datasource = fallback[index].Datasource }
		if value, ok := panelMap["fieldConfig"].(map[string]any); ok { panel.FieldConfig = value } else if index < len(fallback) { panel.FieldConfig = fallback[index].FieldConfig }
		if value, ok := panelMap["options"].(map[string]any); ok { panel.Options = value } else if index < len(fallback) { panel.Options = fallback[index].Options }
		if value, ok := panelMap["rawModel"].(map[string]any); ok { panel.RawModel = value } else { panel.RawModel = panelMap }
		if rawQueries, ok := panelMap["queries"].([]any); ok {
			panel.Queries = make([]model.QueryDefinition, 0, len(rawQueries))
			for _, rawQuery := range rawQueries {
				queryMap, ok := rawQuery.(map[string]any)
				if !ok { continue }
				query := model.QueryDefinition{}
				if value, ok := queryMap["refId"].(string); ok { query.RefID = value }
				if value, ok := queryMap["datasource"].(string); ok { query.Datasource = value }
				if value, ok := queryMap["expression"].(string); ok { query.Expression = value }
				panel.Queries = append(panel.Queries, query)
			}
		} else if index < len(fallback) { panel.Queries = fallback[index].Queries }
		if rawTransforms, ok := panelMap["transformations"].([]any); ok {
			panel.Transformations = make([]map[string]any, 0, len(rawTransforms))
			for _, rawTransform := range rawTransforms {
				transformMap, ok := rawTransform.(map[string]any)
				if ok { panel.Transformations = append(panel.Transformations, transformMap) }
			}
		} else if index < len(fallback) { panel.Transformations = fallback[index].Transformations }
		panels = append(panels, panel)
	}
	if len(panels) == 0 { return fallback }
	return panels
}
