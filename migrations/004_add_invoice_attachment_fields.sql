-- Add invoice attachment fields to financial_documents table
ALTER TABLE financial_documents 
ADD COLUMN IF NOT EXISTS invoice_file TEXT,
ADD COLUMN IF NOT EXISTS invoice_file_name TEXT,
ADD COLUMN IF NOT EXISTS invoice_file_uploaded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS invoice_file_uploaded_by INTEGER REFERENCES users(id);

-- Add invoice attachment fields to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS invoice_file TEXT,
ADD COLUMN IF NOT EXISTS invoice_file_name TEXT,
ADD COLUMN IF NOT EXISTS invoice_file_uploaded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS invoice_file_uploaded_by INTEGER REFERENCES users(id);