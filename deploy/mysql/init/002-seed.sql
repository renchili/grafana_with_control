INSERT INTO drafts (
  id,
  resource_type,
  resource_uid,
  title,
  owner_name,
  base_version_no,
  governance_mode,
  status
) VALUES
  (101, 'dashboard', 'cpu-overview', 'CPU Overview', 'platform-team', 3, 'platform', 'active'),
  (102, 'dashboard', 'request-latency', 'Request Latency', 'platform-team', 5, 'platform', 'conflict'),
  (103, 'dashboard', 'demo-dashboard', 'Demo Dashboard', 'platform-team', 1, 'platform', 'active')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  owner_name = VALUES(owner_name),
  base_version_no = VALUES(base_version_no),
  governance_mode = VALUES(governance_mode),
  status = VALUES(status);

INSERT INTO draft_payloads (
  draft_id,
  payload_json
) VALUES
  (
    101,
    JSON_OBJECT(
      'title', 'CPU Overview',
      'resourceUid', 'cpu-overview',
      'governanceMode', 'platform'
    )
  ),
  (
    102,
    JSON_OBJECT(
      'title', 'Request Latency',
      'resourceUid', 'request-latency',
      'governanceMode', 'platform'
    )
  ),
  (
    103,
    JSON_OBJECT(
      'title', 'Demo Dashboard',
      'resourceUid', 'demo-dashboard',
      'governanceMode', 'platform'
    )
  )
ON DUPLICATE KEY UPDATE
  payload_json = VALUES(payload_json);

INSERT INTO conflicts (
  draft_id,
  payload_json
) VALUES
  (
    102,
    JSON_OBJECT(
      'draftId', 102,
      'resourceUid', 'request-latency',
      'resourceType', 'dashboard',
      'baseVersionNo', 5,
      'currentVersionNo', 6,
      'hasConflict', true,
      'conflictPaths', JSON_ARRAY('query', 'version'),
      'base', JSON_OBJECT(
        'title', 'Request Latency',
        'version', 5,
        'query', 'histogram_quantile(0.95, rate(http_request_duration_bucket[5m]))'
      ),
      'yours', JSON_OBJECT(
        'title', 'Request Latency',
        'version', 5,
        'query', 'histogram_quantile(0.99, rate(http_request_duration_bucket[5m]))'
      ),
      'theirs', JSON_OBJECT(
        'title', 'Request Latency',
        'version', 6,
        'query', 'histogram_quantile(0.95, sum(rate(http_request_duration_bucket[5m])) by (le))'
      )
    )
  )
ON DUPLICATE KEY UPDATE
  payload_json = VALUES(payload_json);
