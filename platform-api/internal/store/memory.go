package store

import (
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/renchili/grafana_with_control/platform-api/internal/model"
)

type MemoryStore struct {
	mu        sync.RWMutex
	drafts    map[int64]*model.Draft
	payloads  map[int64]map[string]any
	conflicts map[int64]*model.ConflictPayload
	nextJobID int64
}

func NewMemoryStore() *MemoryStore {
	now := time.Now().Format(time.RFC3339)
	s := &MemoryStore{
		drafts: map[int64]*model.Draft{
			101: {
				DraftID:        101,
				ResourceType:   "dashboard",
				ResourceUID:    "cpu-overview",
				Title:          "CPU Overview",
				OwnerName:      "platform-team",
				BaseVersionNo:  3,
				GovernanceMode: "platform",
				Status:         model.DraftStatusActive,
				UpdatedAt:      now,
			},
			102: {
				DraftID:        102,
				ResourceType:   "dashboard",
				ResourceUID:    "request-latency",
				Title:          "Request Latency",
				OwnerName:      "platform-team",
				BaseVersionNo:  5,
				GovernanceMode: "platform",
				Status:         model.DraftStatusConflict,
				UpdatedAt:      now,
			},
		},
		payloads: map[int64]map[string]any{},
		conflicts: map[int64]*model.ConflictPayload{
			102: {
				DraftID:          102,
				ResourceUID:      "request-latency",
				ResourceType:     "dashboard",
				BaseVersionNo:    5,
				CurrentVersionNo: 6,
				HasConflict:      true,
				ConflictPaths:    []string{"panels[1].targets[0].expr", "templating.list[0].query"},
				Base: map[string]any{"title": "Request Latency", "version": 5, "query": "histogram_quantile(0.95, rate(http_request_duration_bucket[5m]))"},
				Yours: map[string]any{"title": "Request Latency", "version": 5, "query": "histogram_quantile(0.99, rate(http_request_duration_bucket[5m]))"},
				Theirs: map[string]any{"title": "Request Latency", "version": 6, "query": "histogram_quantile(0.95, sum(rate(http_request_duration_bucket[5m])) by (le))"},
			},
		},
		nextJobID: 2000,
	}
	for id, draft := range s.drafts {
		s.payloads[id] = defaultPayloadFromDraft(*draft)
	}
	return s
}

func (s *MemoryStore) ListDrafts() []model.Draft {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.Draft, 0, len(s.drafts))
	for _, draft := range s.drafts {
		out = append(out, *draft)
	}
	return out
}

func (s *MemoryStore) GetDraft(id int64) (model.Draft, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	d, ok := s.drafts[id]
	if !ok {
		return model.Draft{}, false
	}
	return *d, true
}

func (s *MemoryStore) GetDraftByUID(uid string) (model.Draft, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, d := range s.drafts {
		if d.ResourceUID == uid {
			return *d, true
		}
	}
	return model.Draft{}, false
}

func (s *MemoryStore) CreateDraft(uid string, payload map[string]any) (model.Draft, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, d := range s.drafts {
		if d.ResourceUID == uid {
			return *d, nil
		}
	}
	id := int64(len(s.drafts) + 1000)
	now := time.Now().Format(time.RFC3339)
	draft := &model.Draft{
		DraftID:        id,
		ResourceType:   "dashboard",
		ResourceUID:    uid,
		Title:          "Governed Draft for " + uid,
		OwnerName:      "platform-demo",
		BaseVersionNo:  1,
		GovernanceMode: "platform",
		Status:         model.DraftStatusActive,
		UpdatedAt:      now,
	}
	s.drafts[id] = draft
	if payload == nil {
		payload = defaultPayloadFromDraft(*draft)
	}
	s.payloads[id] = cloneMap(payload)
	return *draft, nil
}

func (s *MemoryStore) GetDraftPayload(id int64) (map[string]any, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	payload, ok := s.payloads[id]
	if !ok {
		return nil, false
	}
	return cloneMap(payload), true
}

func (s *MemoryStore) SaveDraftPayload(id int64, payload map[string]any) (model.Draft, map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.drafts[id]
	if !ok {
		return model.Draft{}, nil, fmt.Errorf("draft not found")
	}
	if payload == nil {
		payload = defaultPayloadFromDraft(*d)
	}
	if title, ok := payload["title"].(string); ok && title != "" {
		d.Title = title
	}
	d.UpdatedAt = time.Now().Format(time.RFC3339)
	s.payloads[id] = cloneMap(payload)
	return *d, cloneMap(payload), nil
}

func (s *MemoryStore) GetConflict(id int64) (*model.ConflictPayload, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	payload, ok := s.conflicts[id]
	if !ok {
		return nil, false
	}
	copy := *payload
	return &copy, true
}

func (s *MemoryStore) PublishDraft(id int64) (*model.ActionResponse, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.drafts[id]
	if !ok {
		return nil, false
	}
	s.nextJobID++
	d.Status = model.DraftStatusPublished
	d.UpdatedAt = time.Now().Format(time.RFC3339)
	return &model.ActionResponse{Success: true, Message: "draft published", JobID: s.nextJobID}, true
}

func (s *MemoryStore) AbandonDraft(id int64) (*model.ActionResponse, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.drafts[id]
	if !ok {
		return nil, false
	}
	d.Status = model.DraftStatusAbandoned
	d.UpdatedAt = time.Now().Format(time.RFC3339)
	return &model.ActionResponse{Success: true, Message: "draft abandoned"}, true
}

func (s *MemoryStore) RebaseDraft(id int64) (*model.ActionResponse, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.drafts[id]
	if !ok {
		return nil, false
	}
	if payload, ok := s.conflicts[id]; ok {
		d.BaseVersionNo = payload.CurrentVersionNo
	}
	d.Status = model.DraftStatusActive
	delete(s.conflicts, id)
	d.UpdatedAt = time.Now().Format(time.RFC3339)
	return &model.ActionResponse{Success: true, Message: "draft rebased"}, true
}

func (s *MemoryStore) SaveAsCopy(id int64, req model.SaveAsCopyRequest) (*model.ActionResponse, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.drafts[id]
	if !ok {
		return nil, false
	}
	s.nextJobID++
	newUID := req.UID
	if newUID == "" {
		newUID = d.ResourceUID + "-copy-" + strconv.FormatInt(s.nextJobID, 10)
	}
	return &model.ActionResponse{Success: true, Message: "copy created", JobID: s.nextJobID, NewResourceUID: newUID}, true
}

func (s *MemoryStore) TakeoverDraft(id int64) (*model.ActionResponse, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.drafts[id]
	if !ok {
		return nil, false
	}
	d.Status = model.DraftStatusActive
	delete(s.conflicts, id)
	d.UpdatedAt = time.Now().Format(time.RFC3339)
	return &model.ActionResponse{Success: true, Message: fmt.Sprintf("takeover completed for draft %d", id)}, true
}

func defaultPayloadFromDraft(d model.Draft) map[string]any {
	return map[string]any{
		"title":          d.Title,
		"resourceUid":    d.ResourceUID,
		"governanceMode": d.GovernanceMode,
	}
}

func cloneMap(input map[string]any) map[string]any {
	out := make(map[string]any, len(input))
	for k, v := range input {
		out[k] = v
	}
	return out
}
