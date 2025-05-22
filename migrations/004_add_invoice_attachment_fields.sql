-- Adiciona campos para anexo de nota fiscal à tabela financial_documents
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS invoice_file TEXT;
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS invoice_file_name TEXT;
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS invoice_file_uploaded_at TIMESTAMP;
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS invoice_file_uploaded_by INTEGER;

-- Adiciona mesmo suporte para a tabela de despesas
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_file TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_file_name TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_file_uploaded_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_file_uploaded_by INTEGER;