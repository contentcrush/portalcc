-- Migração para adicionar exclusão em cascata nas relações de tabelas
-- Esta migração configura as constraints de chave estrangeira para cascade delete

-- Primeiro, remova as constraints existentes
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_project_id_projects_id_fk;
ALTER TABLE project_stages DROP CONSTRAINT IF EXISTS project_stages_project_id_projects_id_fk;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_projects_id_fk;
ALTER TABLE project_comments DROP CONSTRAINT IF EXISTS project_comments_project_id_projects_id_fk;
ALTER TABLE financial_documents DROP CONSTRAINT IF EXISTS financial_documents_project_id_projects_id_fk;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_project_id_projects_id_fk;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_project_id_projects_id_fk;
ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_task_id_tasks_id_fk;
ALTER TABLE task_attachments DROP CONSTRAINT IF EXISTS task_attachments_task_id_tasks_id_fk;
ALTER TABLE comment_reactions DROP CONSTRAINT IF EXISTS comment_reactions_comment_id_task_comments_id_fk;
ALTER TABLE project_comment_reactions DROP CONSTRAINT IF EXISTS project_comment_reactions_comment_id_project_comments_id_fk;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_task_id_tasks_id_fk;

-- Adicione as novas constraints com CASCADE DELETE
ALTER TABLE project_members 
ADD CONSTRAINT project_members_project_id_projects_id_fk 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_stages 
ADD CONSTRAINT project_stages_project_id_projects_id_fk 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_project_id_projects_id_fk 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_comments 
ADD CONSTRAINT project_comments_project_id_projects_id_fk 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE financial_documents 
ADD CONSTRAINT financial_documents_project_id_projects_id_fk 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_project_id_projects_id_fk 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE events 
ADD CONSTRAINT events_project_id_projects_id_fk 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Cascata para tabelas relacionadas às tarefas
ALTER TABLE task_comments 
ADD CONSTRAINT task_comments_task_id_tasks_id_fk 
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_attachments 
ADD CONSTRAINT task_attachments_task_id_tasks_id_fk 
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE comment_reactions 
ADD CONSTRAINT comment_reactions_comment_id_task_comments_id_fk 
FOREIGN KEY (comment_id) REFERENCES task_comments(id) ON DELETE CASCADE;

ALTER TABLE project_comment_reactions 
ADD CONSTRAINT project_comment_reactions_comment_id_project_comments_id_fk 
FOREIGN KEY (comment_id) REFERENCES project_comments(id) ON DELETE CASCADE;

ALTER TABLE events 
ADD CONSTRAINT events_task_id_tasks_id_fk 
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;