-- Adiciona campos para o Google Calendar na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_email TEXT;

-- Adiciona campos para sincronização com Google Calendar na tabela events
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS synced_with_google BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP;