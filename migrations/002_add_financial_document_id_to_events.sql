-- Adiciona coluna financial_document_id na tabela events
ALTER TABLE events ADD COLUMN IF NOT EXISTS financial_document_id INTEGER;