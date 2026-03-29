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
	conflicts map[int64]*model.ConflictPayload
	nextJobID int64
}

func NewMemoryStore() *MemoryStore {
	now := time.Now().Format(time.RFC3339)
	return &MemoryStore{
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
