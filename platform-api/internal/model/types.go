package model

type DraftStatus string

const (
	DraftStatusActive    DraftStatus = "active"
	DraftStatusConflict  DraftStatus = "conflict"
	DraftStatusPublished DraftStatus = "published"
	DraftStatusAbandoned DraftStatus = "abandoned"
)

type Draft struct {
	DraftID         int64       `json:"draftId"`
	ResourceType    string      `json:"resourceType"`
	ResourceUID     string      `json:"resourceUid"`
	Title           string      `json:"title"`
	OwnerName       string      `json:"ownerName"`
	BaseVersionNo   int64       `json:"baseVersionNo"`
	GovernanceMode  string      `json:"governanceMode"`
	Status          DraftStatus `json:"status"`
	UpdatedAt       string      `json:"updatedAt"`
}

type ConflictPayload struct {
	DraftID          int64                  `json:"draftId"`
	ResourceUID      string                 `json:"resourceUid"`
	ResourceType     string                 `json:"resourceType"`
	BaseVersionNo    int64                  `json:"baseVersionNo"`
	CurrentVersionNo int64                  `json:"currentVersionNo"`
	HasConflict      bool                   `json:"hasConflict"`
	ConflictPaths    []string               `json:"conflictPaths"`
	Base             map[string]any         `json:"base"`
	Yours            map[string]any         `json:"yours"`
	Theirs           map[string]any         `json:"theirs"`
}

type ActionResponse struct {
	Success        bool   `json:"success"`
	Message        string `json:"message,omitempty"`
	JobID          int64  `json:"jobId,omitempty"`
	NewResourceUID string `json:"newResourceUid,omitempty"`
}

type SaveAsCopyRequest struct {
	Title string `json:"title"`
	UID   string `json:"uid"`
}
