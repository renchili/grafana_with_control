package store

import "github.com/renchili/grafana_with_control/platform-api/internal/model"

type Store interface {
	ListDrafts() []model.Draft
	GetDraft(id int64) (model.Draft, bool)
	GetDraftByUID(uid string) (model.Draft, bool)
	CreateDraft(uid string, payload map[string]any) (model.Draft, error)
	GetDraftPayload(id int64) (map[string]any, bool)
	SaveDraftPayload(id int64, payload map[string]any) (model.Draft, map[string]any, error)
	GetConflict(id int64) (*model.ConflictPayload, bool)
	PublishDraft(id int64) (*model.ActionResponse, bool)
	AbandonDraft(id int64) (*model.ActionResponse, bool)
	RebaseDraft(id int64) (*model.ActionResponse, bool)
	SaveAsCopy(id int64, req model.SaveAsCopyRequest) (*model.ActionResponse, bool)
	TakeoverDraft(id int64) (*model.ActionResponse, bool)
}
