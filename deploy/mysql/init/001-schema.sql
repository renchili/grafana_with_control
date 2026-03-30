CREATE TABLE IF NOT EXISTS drafts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  resource_type VARCHAR(32) NOT NULL,
  resource_uid VARCHAR(128) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  owner_name VARCHAR(128) NOT NULL,
  base_version_no BIGINT NOT NULL DEFAULT 1,
  governance_mode VARCHAR(32) NOT NULL DEFAULT 'platform',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS draft_payloads (
  draft_id BIGINT PRIMARY KEY,
  payload_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_draft_payloads_draft FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conflicts (
  draft_id BIGINT PRIMARY KEY,
  payload_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_conflicts_draft FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE
);

INSERT INTO drafts (id, resource_type, resource_uid, title, owner_name, base_version_no, governance_mode, status)
VALUES
  (101, 'dashboard', 'cpu-overview', 'CPU Overview', 'platform-team', 3, 'platform', 'active'),
  (102, 'dashboard', 'request-latency', 'Request Latency', 'platform-team', 5, 'platform', 'conflict')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO draft_payloads (draft_id, payload_json)
VALUES
  (101, JSON_OBJECT('title','CPU Overview','resourceUid','cpu-overview','governanceMode','platform')),
  (102, JSON_OBJECT('title','Request Latency','resourceUid','request-latency','governanceMode','platform'))
ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json);

INSERT INTO conflicts (draft_id, payload_json)
VALUES
  (102, JSON_OBJECT(
    'draftId', 102,
    'resourceUid', 'request-latency',
    'resourceType', 'dashboard',
    'baseVersionNo', 5,
    'currentVersionNo', 6,
    'hasConflict', true,
    'conflictPaths', JSON_ARRAY('query', 'version'),
    'base', JSON_OBJECT('title', 'Request Latency', 'version', 5, 'query', 'histogram_quantile(0.95, rate(http_request_duration_bucket[5m]))'),
    'yours', JSON_OBJECT('title', 'Request Latency', 'version', 5, 'query', 'histogram_quantile(0.99, rate(http_request_duration_bucket[5m]))'),
    'theirs', JSON_OBJECT('title', 'Request Latency', 'version', 6, 'query', 'histogram_quantile(0.95, sum(rate(http_request_duration_bucket[5m])) by (le))')
  ))
ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json);
