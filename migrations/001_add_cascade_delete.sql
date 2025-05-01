-- Remover FK existente
ALTER TABLE IF EXISTS financial_documents
DROP CONSTRAINT IF EXISTS financial_documents_project_id_fkey;

-- Adicionar nova FK com CASCADE DELETE
ALTER TABLE financial_documents
ADD CONSTRAINT financial_documents_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Certificar que outros vínculos também têm exclusão em cascata
-- Tarefas
ALTER TABLE IF EXISTS tasks
DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;

ALTER TABLE tasks
ADD CONSTRAINT tasks_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Estágios de projeto
ALTER TABLE IF EXISTS project_stages
DROP CONSTRAINT IF EXISTS project_stages_project_id_fkey;

ALTER TABLE project_stages
ADD CONSTRAINT project_stages_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Membros de projeto
ALTER TABLE IF EXISTS project_members
DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;

ALTER TABLE project_members
ADD CONSTRAINT project_members_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Comentários de projeto
ALTER TABLE IF EXISTS project_comments
DROP CONSTRAINT IF EXISTS project_comments_project_id_fkey;

ALTER TABLE project_comments
ADD CONSTRAINT project_comments_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Despesas
ALTER TABLE IF EXISTS expenses
DROP CONSTRAINT IF EXISTS expenses_project_id_fkey;

ALTER TABLE expenses
ADD CONSTRAINT expenses_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Eventos
ALTER TABLE IF EXISTS events
DROP CONSTRAINT IF EXISTS events_project_id_fkey;

ALTER TABLE events
ADD CONSTRAINT events_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;