-- Adiciona campos necessários para o suporte a despesas no calendário

-- Adiciona expense_id na tabela events
ALTER TABLE IF EXISTS events 
ADD COLUMN IF NOT EXISTS expense_id INTEGER,
ADD CONSTRAINT events_expense_id_fkey
    FOREIGN KEY (expense_id)
    REFERENCES expenses(id) 
    ON DELETE CASCADE;

-- Adiciona campo paid na tabela expenses
ALTER TABLE IF EXISTS expenses
ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT FALSE;