-- Adiciona a coluna paid à tabela de despesas
ALTER TABLE expenses
ADD COLUMN paid BOOLEAN DEFAULT FALSE;