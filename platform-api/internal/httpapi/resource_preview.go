package httpapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func (h *Handler) previewResource(c *gin.Context) {
	uid := c.Param("uid")

	source, err := fetchGrafanaDashboardByUID(uid)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": err.Error()})
		return
	}

	dashboard, ok := source["dashboard"].(map[string]any)
	if !ok {
		c.JSON(http.StatusBadGateway, gin.H{"message": "invalid grafana dashboard payload"})
		return
	}

	preview := cloneAnyMap(dashboard)
	delete(preview, "id")
	delete(preview, "version")
	delete(preview, "id")
	delete(preview, "version")
	delete(preview, "id")
	delete(preview, "version")

	previewUID := fmt.Sprintf("%s-preview-%d", uid, time.Now().Unix())
	preview["uid"] = previewUID
	if title, ok := preview["title"].(string); ok && title != "" {
		preview["title"] = title + " [Preview]"
	}

	rawPanels, _ := preview["panels"].([]any)

	banner := map[string]any{
		"id":    999999,
		"title": "Preview Notice",
		"type":  "text",
		"gridPos": map[string]any{
			"h": 4,
			"w": 24,
			"x": 0,
			"y": 0,
		},
		"options": map[string]any{
			"mode": "html",
			"content": "<div style='padding:12px;border:1px solid #ff9830;border-radius:6px;background:rgba(255,152,48,0.12);color:#ff9830;font-weight:600'>This is an unsaved preview version. Preview only. It does not affect the final published version.</div>",
		},
		"transparent": true,
	}

	shifted := make([]any, 0, len(rawPanels)+1)
	shifted = append(shifted, banner)

	for _, p := range rawPanels {
		pm, ok := p.(map[string]any)
		if !ok {
			shifted = append(shifted, p)
			continue
		}
		cp := cloneAnyMap(pm)
		if gp, ok := cp["gridPos"].(map[string]any); ok {
			ngp := cloneAnyMap(gp)
			switch y := ngp["y"].(type) {
			case float64:
				ngp["y"] = y + 4
			case int:
				ngp["y"] = y + 4
			default:
				ngp["y"] = 4
			}
			cp["gridPos"] = ngp
		}
		shifted = append(shifted, cp)
	}

	preview["panels"] = shifted

	baseURL := strings.TrimRight(os.Getenv("GRAFANA_URL"), "/")
	if baseURL == "" {
		baseURL = "http://grafana:3000"
	}

	body := map[string]any{
		"dashboard": preview,
		"overwrite": false,
		"message":   "preview from grafana control plane",
	}

	raw, err := json.Marshal(body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	req, err := http.NewRequest(http.MethodPost, baseURL+"/api/dashboards/db", bytes.NewReader(raw))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	req.Header.Set("Content-Type", "application/json")
	applyGrafanaAuth(req)

	client := &http.Client{Timeout: 15 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": err.Error()})
		return
	}
	defer res.Body.Close()

	if res.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
		c.JSON(http.StatusBadGateway, gin.H{"message": fmt.Sprintf("preview publish failed: %s", strings.TrimSpace(string(body)))})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url": fmt.Sprintf("%s/d/%s/preview", baseURL, previewUID),
	})
}

func fetchGrafanaDashboardByUID(uid string) (map[string]any, error) {
	baseURL := strings.TrimRight(os.Getenv("GRAFANA_URL"), "/")
	if baseURL == "" {
		baseURL = "http://grafana:3000"
	}

	req, err := http.NewRequest(http.MethodGet, baseURL+"/api/dashboards/uid/"+uid, nil)
	if err != nil {
		return nil, err
	}
	applyGrafanaAuth(req)

	client := &http.Client{Timeout: 15 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
		return nil, fmt.Errorf("fetch dashboard failed: %s", strings.TrimSpace(string(body)))
	}

	var payload map[string]any
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, err
	}
	return payload, nil
}

func applyGrafanaAuth(req *http.Request) {
	if token := os.Getenv("GRAFANA_TOKEN"); token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
		return
	}
	if user := os.Getenv("GRAFANA_BASIC_USER"); user != "" {
		req.SetBasicAuth(user, os.Getenv("GRAFANA_BASIC_PASSWORD"))
	}
}

func cloneAnyMap(in map[string]any) map[string]any {
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}
