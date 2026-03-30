package model

type DraftStatus string

const (
	DraftStatusActive    DraftStatus = "active"
	DraftStatusConflict  DraftStatus = "conflict"
	DraftStatusPublished DraftStatus = "published"
	DraftStatusAbandoned DraftStatus = "abandoned"
)

type Draft struct {
	DraftID        int64       `json:"draftId"`
	ResourceType   string      `json:"resourceType"`
	ResourceUID    string      `json:"resourceUid"`
	Title          string      `json:"title"`
	OwnerName      string      `json:"ownerName"`
	BaseVersionNo  int64       `json:"baseVersionNo"`
	GovernanceMode string      `json:"governanceMode"`
	Status         DraftStatus `json:"status"`
	UpdatedAt      string      `json:"updatedAt"`
}

type QueryDefinition struct {
	RefID      string `json:"refId"`
	Datasource string `json:"datasource,omitempty"`
	Expression string `json:"expression"`
}

type PanelDefinition struct {
	ID              int64             `json:"id"`
	Title           string            `json:"title"`
	Type            string            `json:"type"`
	Datasource      string            `json:"datasource,omitempty"`
	Queries         []QueryDefinition `json:"queries"`
	Transformations []map[string]any  `json:"transformations"`
	FieldConfig     map[string]any    `json:"fieldConfig,omitempty"`
	Options         map[string]any    `json:"options,omitempty"`
	RawModel        map[string]any    `json:"rawModel"`
}

type ResourceDefinition struct {
	UID                string            `json:"uid"`
	Title              string            `json:"title"`
	OwnerName          string            `json:"ownerName"`
	GovernanceMode     string            `json:"governanceMode"`
	PublishedVersionNo int64             `json:"publishedVersionNo"`
	HasDraft           bool              `json:"hasDraft"`
	DraftID            int64             `json:"draftId,omitempty"`
	Panels             []PanelDefinition `json:"panels"`
}

type DraftDetail struct {
	DraftID        int64             `json:"draftId"`
	ResourceUID    string            `json:"resourceUid"`
	Title          string            `json:"title"`
	OwnerName      string            `json:"ownerName"`
	Status         DraftStatus       `json:"status"`
	BaseVersionNo  int64             `json:"baseVersionNo"`
	GovernanceMode string            `json:"governanceMode"`
	Panels         []PanelDefinition `json:"panels"`
	RawDraft       any               `json:"rawDraft,omitempty"`
}

type ConflictPayload struct {
	DraftID          int64          `json:"draftId"`
	ResourceUID      string         `json:"resourceUid"`
	ResourceType     string         `json:"resourceType"`
	BaseVersionNo    int64          `json:"baseVersionNo"`
	CurrentVersionNo int64          `json:"currentVersionNo"`
	HasConflict      bool           `json:"hasConflict"`
	ConflictPaths    []string       `json:"conflictPaths"`
	Base             map[string]any `json:"base"`
	Yours            map[string]any `json:"yours"`
	Theirs           map[string]any `json:"theirs"`
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
