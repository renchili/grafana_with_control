package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/renchili/grafana_with_control/platform-api/internal/model"
)

type MySQLStore struct { db *sql.DB }

func NewMySQLStoreFromEnv() (*MySQLStore, error) {
	dsn := os.Getenv("DATABASE_DSN")
	if dsn == "" { return nil, fmt.Errorf("DATABASE_DSN not set") }
	db, err := sql.Open("mysql", dsn)
	if err != nil { return nil, err }
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)
	if err := db.Ping(); err != nil { return nil, err }
	return &MySQLStore{db: db}, nil
}

func (s *MySQLStore) ListDrafts() []model.Draft {
	rows, err := s.db.Query(`SELECT id, resource_type, resource_uid, title, owner_name, base_version_no, governance_mode, status, DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') FROM drafts ORDER BY id`)
	if err != nil { return nil }
	defer rows.Close()
	out := []model.Draft{}
	for rows.Next() { var d model.Draft; _ = rows.Scan(&d.DraftID,&d.ResourceType,&d.ResourceUID,&d.Title,&d.OwnerName,&d.BaseVersionNo,&d.GovernanceMode,&d.Status,&d.UpdatedAt); out = append(out,d) }
	return out
}

func (s *MySQLStore) GetDraft(id int64) (model.Draft, bool) { return s.getDraftWhere(`id = ?`, id) }
func (s *MySQLStore) GetDraftByUID(uid string) (model.Draft, bool) { return s.getDraftWhere(`resource_uid = ?`, uid) }

func (s *MySQLStore) getDraftWhere(clause string, arg any) (model.Draft, bool) {
	var d model.Draft
	err := s.db.QueryRow(`SELECT id, resource_type, resource_uid, title, owner_name, base_version_no, governance_mode, status, DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') FROM drafts WHERE `+clause+` LIMIT 1`, arg).Scan(&d.DraftID,&d.ResourceType,&d.ResourceUID,&d.Title,&d.OwnerName,&d.BaseVersionNo,&d.GovernanceMode,&d.Status,&d.UpdatedAt)
	if err != nil { return model.Draft{}, false }
	return d, true
}

func (s *MySQLStore) CreateDraft(uid string, payload map[string]any) (model.Draft, error) {
	if existing, ok := s.GetDraftByUID(uid); ok { return existing, nil }
	title := "Governed Draft for "+uid
	res, err := s.db.Exec(`INSERT INTO drafts (resource_type, resource_uid, title, owner_name, base_version_no, governance_mode, status) VALUES ('dashboard', ?, ?, 'platform-demo', 1, 'platform', 'active')`, uid, title)
	if err != nil { return model.Draft{}, err }
	id, _ := res.LastInsertId()
	if payload == nil { payload = map[string]any{"title": title, "resourceUid": uid, "governanceMode": "platform"} }
	if err := s.upsertPayload(id, payload); err != nil { return model.Draft{}, err }
	d, _ := s.GetDraft(id)
	return d, nil
}

func (s *MySQLStore) GetDraftPayload(id int64) (map[string]any, bool) {
	var raw []byte
	if err := s.db.QueryRow(`SELECT payload_json FROM draft_payloads WHERE draft_id = ?`, id).Scan(&raw); err != nil { return nil, false }
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil { return nil, false }
	return out, true
}

func (s *MySQLStore) SaveDraftPayload(id int64, payload map[string]any) (model.Draft, map[string]any, error) {
	if payload == nil { payload = map[string]any{} }
	if err := s.upsertPayload(id, payload); err != nil { return model.Draft{}, nil, err }
	if title, ok := payload["title"].(string); ok && title != "" {
		_, _ = s.db.Exec(`UPDATE drafts SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, title, id)
	} else {
		_, _ = s.db.Exec(`UPDATE drafts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, id)
	}
	d, ok := s.GetDraft(id); if !ok { return model.Draft{}, nil, fmt.Errorf("draft not found") }
	return d, payload, nil
}

func (s *MySQLStore) upsertPayload(id int64, payload map[string]any) error {
	raw, err := json.Marshal(payload)
	if err != nil { return err }
	_, err = s.db.Exec(`INSERT INTO draft_payloads (draft_id, payload_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)`, id, raw)
	return err
}

func (s *MySQLStore) GetConflict(id int64) (*model.ConflictPayload, bool) {
	var raw []byte
	if err := s.db.QueryRow(`SELECT payload_json FROM conflicts WHERE draft_id = ?`, id).Scan(&raw); err != nil { return nil, false }
	var c model.ConflictPayload
	if err := json.Unmarshal(raw, &c); err != nil { return nil, false }
	return &c, true
}


func (s *MySQLStore) GetPublishedPayload(uid string) (map[string]any, int64, bool) {
	var raw []byte
	var version int64
	err := s.db.QueryRow(`SELECT payload_json, version_no FROM published_payloads WHERE resource_uid = ?`, uid).Scan(&raw, &version)
	if err != nil { return nil, 0, false }
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil { return nil, 0, false }
	return out, version, true
}

func (s *MySQLStore) UpsertPublishedPayload(uid string, payload map[string]any, version int64) error {
	raw, err := json.Marshal(payload)
	if err != nil { return err }
	_, err = s.db.Exec(`
		INSERT INTO published_payloads (resource_uid, payload_json, version_no)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE
			payload_json = VALUES(payload_json),
			version_no = VALUES(version_no)
	`, uid, raw, version)
	return err
}

func (s *MySQLStore) GetResourceDefinitionByUID(uid string) (model.Draft, map[string]any, bool) {
	draft, ok := s.GetDraftByUID(uid)
	if !ok { return model.Draft{}, nil, false }

	if payload, version, found := s.GetPublishedPayload(uid); found {
		draft.BaseVersionNo = version
		return draft, payload, true
	}

	payload, _ := s.GetDraftPayload(draft.DraftID)
	return draft, payload, true
}

func (s *MySQLStore) PublishDraft(id int64) (*model.ActionResponse, bool) {
	draft, ok := s.GetDraft(id)
	if !ok { return nil, false }

	payload, ok := s.GetDraftPayload(id)
	if !ok { return nil, false }

	nextVersion := draft.BaseVersionNo + 1
	if err := s.UpsertPublishedPayload(draft.ResourceUID, payload, nextVersion); err != nil {
		return nil, false
	}

	res, err := s.db.Exec(`UPDATE drafts SET status = 'published', base_version_no = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, nextVersion, id)
	if err != nil { return nil, false }
	n,_ := res.RowsAffected()
	if n==0 { return nil,false }

	return &model.ActionResponse{Success:true, Message:"draft published", JobID:id}, true
}

func (s *MySQLStore) AbandonDraft(id int64) (*model.ActionResponse, bool) {
	res, err := s.db.Exec(`UPDATE drafts SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, id)
	if err != nil { return nil,false }
	n,_ := res.RowsAffected()
	if n==0 { return nil,false }
	return &model.ActionResponse{Success:true, Message:"draft abandoned"}, true
}

func (s *MySQLStore) RebaseDraft(id int64) (*model.ActionResponse, bool) {
	_, _ = s.db.Exec(`DELETE FROM conflicts WHERE draft_id = ?`, id)
	res, err := s.db.Exec(`UPDATE drafts SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, id)
	if err != nil { return nil,false }
	n,_ := res.RowsAffected()
	if n==0 { return nil,false }
	return &model.ActionResponse{Success:true, Message:"draft rebased"}, true
}

func (s *MySQLStore) SaveAsCopy(id int64, req model.SaveAsCopyRequest) (*model.ActionResponse, bool) {
	d, ok := s.GetDraft(id)
	if !ok { return nil,false }
	newUID := req.UID
	if newUID=="" { newUID = d.ResourceUID+"-copy" }
	payload, _ := s.GetDraftPayload(id)
	newDraft, err := s.CreateDraft(newUID, payload)
	if err != nil { return nil,false }
	return &model.ActionResponse{Success:true, Message:"copy created", JobID:newDraft.DraftID, NewResourceUID:newUID}, true
}

func (s *MySQLStore) TakeoverDraft(id int64) (*model.ActionResponse, bool) {
	_, _ = s.db.Exec(`DELETE FROM conflicts WHERE draft_id = ?`, id)
	res, err := s.db.Exec(`UPDATE drafts SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, id)
	if err != nil { return nil,false }
	n,_ := res.RowsAffected()
	if n==0 { return nil,false }
	return &model.ActionResponse{Success:true, Message:"takeover completed"}, true
}
