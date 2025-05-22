-- Criação do enum tipo special_status se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'special_status') THEN
        CREATE TYPE special_status AS ENUM ('delayed', 'paused', 'canceled', 'none');
    END IF;
END $$;

-- Adicionar campo special_status à tabela projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS special_status special_status DEFAULT 'none';

-- Criar tabela de histórico de status de projeto
CREATE TABLE IF NOT EXISTS project_status_history (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  previous_status special_status NOT NULL,
  new_status special_status NOT NULL,
  changed_by INTEGER NOT NULL,
  change_date TIMESTAMP DEFAULT NOW(),
  reason TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);