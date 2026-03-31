package httpapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/renchili/grafana_with_control/platform-api/internal/model"
)

func publishDraftToGrafana(draft model.Draft, payload map[string]any) error {
	grafanaURL := os.Getenv("GRAFANA_URL")
	if grafanaURL == "" {
		grafanaURL = "http://grafana:3000"
	}

	apiKey := os.Getenv("GRAFANA_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("missing GRAFANA_API_KEY")
	}

	body := map[string]any{
		"dashboard": payload,
		"overwrite": true,
	}

	b, _ := json.Marshal(body)

	req, err := http.NewRequest(
		"POST",
		grafanaURL+"/api/dashboards/db",
		bytes.NewReader(b),
	)
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("grafana publish failed: %d", resp.StatusCode)
	}

	return nil
}
