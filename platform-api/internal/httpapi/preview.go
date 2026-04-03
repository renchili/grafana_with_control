package httpapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) previewDraft(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: 这里应该调用 Grafana API 创建临时 dashboard
	// 先简化：假设 preview uid 固定（你后面可以改成动态）
	previewUID := "preview-temp"

	url := "/d/" + previewUID

	c.JSON(http.StatusOK, gin.H{
		"url": url,
	})
}
