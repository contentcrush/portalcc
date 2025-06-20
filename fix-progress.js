import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Progress mapping based on status
const statusProgressMap = {
  'proposta': 14,
  'proposta_aceita': 29,
  'pre_producao': 43,
  'producao': 57,
  'pos_revisao': 71,
  'entregue': 86,
  'concluido': 100
};

async function fixProjectProgress() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Iniciando correção do progresso dos projetos...');
    
    // Get all projects with their current status and progress
    const result = await client.query(`
      SELECT id, name, status, progress 
      FROM projects 
      ORDER BY id
    `);
    
    console.log(`📊 Encontrados ${result.rows.length} projetos para analisar`);
    
    let updatedCount = 0;
    
    for (const project of result.rows) {
      const expectedProgress = statusProgressMap[project.status];
      
      if (expectedProgress && project.progress !== expectedProgress) {
        await client.query(`
          UPDATE projects 
          SET progress = $1 
          WHERE id = $2
        `, [expectedProgress, project.id]);
        
        console.log(`✅ Projeto "${project.name}" (ID: ${project.id}): ${project.progress}% → ${expectedProgress}% (status: ${project.status})`);
        updatedCount++;
      } else if (!expectedProgress) {
        console.log(`⚠️  Projeto "${project.name}" (ID: ${project.id}): status desconhecido "${project.status}"`);
      } else {
        console.log(`✓  Projeto "${project.name}" (ID: ${project.id}): progresso já correto (${project.progress}%)`);
      }
    }
    
    console.log(`\n🎉 Correção concluída! ${updatedCount} projetos atualizados.`);
    
    // Verify the results
    const verificationResult = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(progress) as avg_progress
      FROM projects 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('\n📈 Resumo por status:');
    verificationResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} projetos, progresso médio: ${Math.round(row.avg_progress)}%`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao corrigir progresso:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixProjectProgress().catch(console.error);