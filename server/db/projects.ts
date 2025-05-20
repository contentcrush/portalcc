import { and, count, desc, eq, like, sql } from 'drizzle-orm';
import { db } from '../db';
import { projects, projectMembers, projectStages } from '../../shared/schema';

/**
 * Obtém projetos paginados com opções avançadas de filtragem e relações
 */
export async function getProjectsPaginated(options: {
  page?: number; 
  limit?: number; 
  includeRelations?: boolean;
  clientId?: number;
  status?: string;
  searchTerm?: string;
}): Promise<{
  data: any[]; 
  total: number; 
  page: number; 
  totalPages: number;
}> {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const offset = (page - 1) * limit;
  
  // Construir condições de filtro
  let conditions = [] as any[];
  
  if (options.clientId) {
    conditions.push(eq(projects.client_id, options.clientId));
  }
  
  if (options.status) {
    conditions.push(eq(projects.status, options.status));
  }
  
  if (options.searchTerm) {
    conditions.push(
      like(projects.name, `%${options.searchTerm}%`)
    );
  }
  
  // Aplicar WHERE se houver condições
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  // Consulta para o total de registros (para paginação)
  const totalQuery = await db
    .select({ value: count() })
    .from(projects)
    .where(whereClause);
  
  const total = totalQuery[0].value;
  const totalPages = Math.ceil(total / limit);
  
  // Consulta principal para os projetos
  const projectsData = await db
    .select()
    .from(projects)
    .where(whereClause)
    .orderBy(desc(projects.creation_date))
    .limit(limit)
    .offset(offset);
  
  // Se precisar incluir relações
  if (options.includeRelations) {
    // Obter IDs de projetos para fazer JOIN eficiente
    const projectIds = projectsData.map(p => p.id);
    
    // Consultas em lote para todas as relações necessárias
    const membersPromise = projectIds.length > 0 ? db
      .select()
      .from(projectMembers)
      .where(sql`${projectMembers.project_id} IN (${projectIds.join(',')})`) : Promise.resolve([]);
      
    const stagesPromise = projectIds.length > 0 ? db
      .select()
      .from(projectStages)
      .where(sql`${projectStages.project_id} IN (${projectIds.join(',')})`) : Promise.resolve([]);
    
    // Executar consultas em paralelo
    const [allMembers, allStages] = await Promise.all([
      membersPromise,
      stagesPromise
    ]);
    
    // Agrupar relações por ID do projeto para acesso rápido O(1)
    const membersByProject: Record<number, typeof allMembers> = {};
    const stagesByProject: Record<number, typeof allStages> = {};
    
    allMembers.forEach(member => {
      if (!membersByProject[member.project_id]) {
        membersByProject[member.project_id] = [];
      }
      membersByProject[member.project_id].push(member);
    });
    
    allStages.forEach(stage => {
      if (!stagesByProject[stage.project_id]) {
        stagesByProject[stage.project_id] = [];
      }
      stagesByProject[stage.project_id].push(stage);
    });
    
    // Enriquecer os projetos com suas relações
    const projectsWithRelations = projectsData.map(project => ({
      ...project,
      members: membersByProject[project.id] || [],
      stages: stagesByProject[project.id] || []
    }));
    
    return {
      data: projectsWithRelations,
      total,
      page,
      totalPages
    };
  }
  
  return {
    data: projectsData,
    total,
    page,
    totalPages
  };
}