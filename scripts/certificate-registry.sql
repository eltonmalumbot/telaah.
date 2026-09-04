CREATE TABLE IF NOT EXISTS certificate_registry (
  certificate_id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  recipient_name text NOT NULL,
  recipient_group text NOT NULL DEFAULT '',
  event_name text NOT NULL,
  organizer text NOT NULL,
  certificate_number text NOT NULL DEFAULT '',
  event_date date NOT NULL,
  issuer_fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS certificate_registry_status_idx
  ON certificate_registry (status, issued_at DESC);
