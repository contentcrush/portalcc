import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configurar o pool para usar sempre UTC
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  // Garantir que o PostgreSQL sempre use UTC
  // para todas as operações relacionadas a datas e horários
  options: `-c timezone=UTC`
});

// Conecta e configura o cliente Drizzle com o timezone UTC
export const db = drizzle(pool, { schema });