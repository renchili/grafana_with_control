package httpapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	previewTagPrefix       = "preview-temp"
	previewExpireTagPrefix = "preview-expire-at:"
	previewTTL             = 1 * time.Minute
)

var previewCleanupOnce sync.Once

func init() {
	previewCleanupOnce.Do(func() {
		go runPreviewCleanupLoop()
	})
}

func (h *Handler) previewResource(c *gin.Context) {

	uid := c.Param("uid")

	source, err := fetchGrafanaDashboardByUID(uid)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": err.Error()})
		return
	}

	src, ok := source["dashboard"].(map[string]any)
	if !ok {
		c.JSON(http.StatusBadGateway, gin.H{"message": "invalid grafana dashboard payload"})
		return
	}

	previewUID := fmt.Sprintf("%s-preview-%d", uid, time.Now().Unix())
	title, _ := src["title"].(string)
	if title == "" {
		title = uid
	}

	rawPanels, _ := src["panels"].([]any)

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

	expireAt := time.Now().Add(previewTTL).Unix()
	tags := readStringSlice(src["tags"])
	tags = append(tags, previewTagPrefix, previewExpireTagPrefix+strconv.FormatInt(expireAt, 10))

	clean := map[string]any{
		"id":            nil,
		"uid":           previewUID,
		"title":         title + " [Preview]",
		"schemaVersion": src["schemaVersion"],
		"version":       0,
		"tags":          tags,
		"timezone":      src["timezone"],
		"refresh":       src["refresh"],
		"editable":      false,
		"panels":        shifted,
	}

	fmt.Printf("preview create uid=%s tags=%v\n", previewUID, tags)

	baseURL := strings.TrimRight(os.Getenv("GRAFANA_URL"), "/")
	if baseURL == "" {
		baseURL = "http://grafana:3000"
	}

	body := map[string]any{
		"dashboard": clean,
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

	host := c.GetHeader("X-Forwarded-Host")
	if host == "" {
		host = c.Request.Host
	}
	if host == "" {
		host = c.Request.Host
	}
	if !strings.HasPrefix(host, "http://") && !strings.HasPrefix(host, "https://") {
		host = "http://" + host
	}

	publicURL := fmt.Sprintf("%s/d/%s/preview", strings.TrimRight(host, "/"), previewUID)

	c.JSON(http.StatusOK, gin.H{
		"url":        publicURL,
		"previewUid": previewUID,
		"expireAt":   expireAt,
	})
}

func runPreviewCleanupLoop() {
	fmt.Println("preview cleanup loop started")
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		if err := cleanupExpiredPreviewDashboards(); err != nil {
			fmt.Printf("preview cleanup error: %v\n", err)
		}
		<-ticker.C
	}
}

func cleanupExpiredPreviewDashboards() error {
	fmt.Println("preview cleanup tick")
	baseURL := strings.TrimRight(os.Getenv("GRAFANA_URL"), "/")
	if baseURL == "" {
		baseURL = "http://grafana:3000"
	}

	req, err := http.NewRequest(http.MethodGet, baseURL+"/api/search?type=dash-db&tag="+previewTagPrefix, nil)
	if err != nil {
		return err
	}
	applyGrafanaAuth(req)

	client := &http.Client{Timeout: 15 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
		return fmt.Errorf("search preview dashboards failed: %s", strings.TrimSpace(string(body)))
	}

	var items []map[string]any
	if err := json.NewDecoder(res.Body).Decode(&items); err != nil {
		return err
	}

	fmt.Printf("preview cleanup found %d dashboards\n", len(items))

	now := time.Now().Unix()

	for _, item := range items {
		uid, _ := item["uid"].(string)
		if uid == "" {
			continue
		}

		detail, err := fetchGrafanaDashboardByUID(uid)
		if err != nil {
			continue
		}

		dashboard, ok := detail["dashboard"].(map[string]any)
		if !ok {
			continue
		}

		tags := readStringSlice(dashboard["tags"])
		expireAt, ok := extractExpireAt(tags)
		if !ok {
			fmt.Printf("preview cleanup skip uid=%s reason=no-expire-tag\n", uid)
			continue
		}
		if now < expireAt {
			fmt.Printf("preview cleanup keep uid=%s expireAt=%d now=%d\n", uid, expireAt, now)
			continue
		}

		fmt.Printf("preview cleanup delete uid=%s expireAt=%d now=%d\n", uid, expireAt, now)
		if err := deleteGrafanaDashboardByUID(uid); err != nil {
			fmt.Printf("preview cleanup delete failed uid=%s err=%v\n", uid, err)
		} else {
			fmt.Printf("preview cleanup delete success uid=%s\n", uid)
		}
	}

	return nil
}

func deleteGrafanaDashboardByUID(uid string) error {
	baseURL := strings.TrimRight(os.Getenv("GRAFANA_URL"), "/")
	if baseURL == "" {
		baseURL = "http://grafana:3000"
	}

	req, err := http.NewRequest(http.MethodDelete, baseURL+"/api/dashboards/uid/"+uid, nil)
	if err != nil {
		return err
	}
	applyGrafanaAuth(req)

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode >= 300 && res.StatusCode != 404 {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
		return fmt.Errorf("delete preview failed: %s", strings.TrimSpace(string(body)))
	}

	return nil
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

func readStringSlice(v any) []string {
	raw, ok := v.([]any)
	if !ok {
		if s, ok := v.([]string); ok {
			return append([]string{}, s...)
		}
		return []string{}
	}
	out := make([]string, 0, len(raw))
	for _, item := range raw {
		if s, ok := item.(string); ok {
			out = append(out, s)
		}
	}
	return out
}

func extractExpireAt(tags []string) (int64, bool) {
	for _, tag := range tags {
		if strings.HasPrefix(tag, previewExpireTagPrefix) {
			v := strings.TrimPrefix(tag, previewExpireTagPrefix)
			ts, err := strconv.ParseInt(v, 10, 64)
			if err == nil {
				return ts, true
			}
		}
	}
	return 0, false
}
