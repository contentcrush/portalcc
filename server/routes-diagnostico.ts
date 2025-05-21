import { Request, Response } from "express";
import { db } from "./db";

export function registerDiagnosticoRoutes(app: any) {
  // Endpoint de diagnóstico para verificar conexão com o banco de dados
  app.get("/api/diagnostico", async (req: Request, res: Response) => {
    try {
      // Informações do ambiente
      const env = {
        node_env: process.env.NODE_ENV || "não definido",
        database_url: process.env.DATABASE_URL 
          ? process.env.DATABASE_URL.split('@')[1].split('/')[0] 
          : "não disponível",
        tz: process.env.TZ || "não definido",
        hostname: req.hostname,
        isDeployed: req.hostname.includes('.replit.app'),
        timestamp: new Date().toISOString(),
        timezoneBrowser: new Date().toString()
      };

      // Verificar se podemos acessar o banco de dados
      const dbTest = await db.execute(`SELECT 1 as test`);
      
      // Verificar projetos (contagem)
      const projectCount = await db.execute(`SELECT COUNT(*) as count FROM projects`);
      
      // Amostra de projetos
      const sampleProjects = await db.execute(`
        SELECT id, name, status, creation_date, client_id
        FROM projects
        ORDER BY id
        LIMIT 3
      `);

      res.json({
        status: "Diagnóstico completado com sucesso",
        env,
        dbConnected: true,
        projectCount: projectCount.rows[0],
        sampleProjects: sampleProjects.rows,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Erro no diagnóstico do sistema:", error);
      res.status(500).json({
        status: "Falha no diagnóstico",
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
    }
  });
}