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

	"github.com/renchili/grafana_with_control/platform-api/internal/model"
)

type grafanaDashboardUpsertRequest struct {
	Dashboard map[string]any `json:"dashboard"`
	FolderID  int            `json:"folderId,omitempty"`
	Message   string         `json:"message,omitempty"`
	Overwrite bool           `json:"overwrite"`
}

func publishDraftToGrafana(draft model.Draft, payload map[string]any) error {
	baseURL := strings.TrimRight(os.Getenv("GRAFANA_URL"), "/")
	if baseURL == "" {
		return nil
	}

	body := grafanaDashboardUpsertRequest{
		Dashboard: buildGrafanaDashboardPayload(draft, payload),
		Overwrite: true,
		Message:   fmt.Sprintf("published from grafana control plane draft %d", draft.DraftID),
	}

	raw, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal publish body: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, baseURL+"/api/dashboards/db", bytes.NewReader(raw))
	if err != nil {
		return fmt.Errorf("build publish request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	if token := os.Getenv("GRAFANA_TOKEN"); token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	} else if user := os.Getenv("GRAFANA_BASIC_USER"); user != "" {
		req.SetBasicAuth(user, os.Getenv("GRAFANA_BASIC_PASSWORD"))
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("call grafana api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("grafana publish failed: status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	return nil
}

func buildGrafanaDashboardPayload(draft model.Draft, payload map[string]any) map[string]any {
	title, _ := payload["title"].(string)
	if title == "" {
		title = draft.Title
	}

	panels := []any{}
	if rawPanels, ok := payload["panels"].([]any); ok {
		for _, rawPanel := range rawPanels {
			panelMap, ok := rawPanel.(map[string]any)
			if !ok {
				continue
			}
			if rawModel, ok := panelMap["rawModel"].(map[string]any); ok {
				panels = append(panels, rawModel)
			} else {
				panels = append(panels, panelMap)
			}
		}
	}
	if len(panels) == 0 {
		for _, panel := range buildPanelsForDraft(draft) {
			panels = append(panels, panel.RawModel)
		}
	}

	return map[string]any{
		"uid":           draft.ResourceUID,
		"title":         title,
		"schemaVersion": 39,
		"version":       draft.BaseVersionNo,
		"editable":      false,
		"timezone":      "browser",
		"refresh":       "30s",
		"tags":          []string{"governed", "control-plane"},
		"panels":        panels,
	}
}
