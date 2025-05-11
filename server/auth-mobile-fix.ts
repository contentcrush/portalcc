import { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from "@shared/schema";
import { db } from './db';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';
import { comparePassword } from './auth';

// Chave para assinatura de tokens
const JWT_SECRET = process.env.JWT_SECRET || 'content-crush-super-secret-key';
// Tempo de expiração do token de acesso (15 minutos)
const ACCESS_TOKEN_EXPIRY = '15m';
// Tempo de expiração do token de refresh (7 dias)
const REFRESH_TOKEN_EXPIRY = '7d';

// Tipo para usuário decodificado do token
interface DecodedUser {
  id: number;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Função utilitária para configurar cookies com suporte aprimorado para dispositivos móveis
 */
function setCookies(res: Response, accessToken: string, refreshToken: string) {
  // Definir cookie do token de acesso
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 'strict' pode causar problemas em navegadores móveis
    maxAge: 15 * 60 * 1000, // 15 minutos em milissegundos
  });

  // Definir cookie do token de refresh
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 'strict' pode causar problemas em navegadores móveis
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em milissegundos
    path: '/api/auth/refresh', // Restringir o cookie apenas para a rota de refresh
  });
}

/**
 * Gerar tokens JWT para autenticação
 */
function generateTokens(user: User) {
  // Gerar token de acesso
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  // Gerar token de refresh
  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

/**
 * Configura middleware para compatibilidade melhorada com dispositivos móveis
 */
export function setupMobileAuth(app: Express) {
  // Detectar dispositivos móveis
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.headers['user-agent'] || '';
    req.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    next();
  });

  // Endpoint específico para renovação de token em dispositivos móveis
  app.post('/api/auth/mobile-refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ message: 'Token de refresh não fornecido' });
      }

      // Verificar token de refresh
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as DecodedUser;
      
      if (!decoded || !decoded.id) {
        return res.status(401).json({ message: 'Token de refresh inválido' });
      }

      // Buscar usuário
      const [user] = await db.select().from(users).where(eq(users.id, decoded.id));

      if (!user) {
        return res.status(401).json({ message: 'Usuário não encontrado' });
      }

      // Gerar novos tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

      // Responder com novos tokens para dispositivos móveis
      return res.json({ 
        accessToken, 
        refreshToken: newRefreshToken,
        expiresIn: 15 * 60, // 15 minutos em segundos
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Erro ao renovar token mobile:', error);
      return res.status(401).json({ message: 'Falha na autenticação' });
    }
  });

  // Endpoint específico para login em dispositivos móveis
  app.post('/api/auth/mobile-login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      // Lógica de autenticação (deve ser coordenada com o fluxo de autenticação principal)
      // Esta é apenas uma estrutura, a verificação real deve utilizar o mesmo mecanismo de auth.ts
      
      // Buscar usuário
      const [user] = await db.select().from(users).where(eq(users.username, username));
      
      if (!user) {
        return res.status(401).json({ message: 'Usuário não encontrado' });
      }
      
      // Verificar senha usando a mesma função de auth.ts
      const validPassword = await comparePassword(password, user.password);
      
      if (!validPassword) {
        console.log(`Falha de login mobile para usuário: ${username} - Senha inválida`);
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
      
      // Gerar tokens
      const { accessToken, refreshToken } = generateTokens(user);
      
      // Configurar cookies para navegadores
      setCookies(res, accessToken, refreshToken);
      
      // Responder com tokens para uso em dispositivos móveis
      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token: accessToken,
        refreshToken,
        expiresIn: 15 * 60 // 15 minutos em segundos
      });
    } catch (error) {
      console.error('Erro no login mobile:', error);
      return res.status(401).json({ message: 'Falha na autenticação' });
    }
  });

  // Verificar token de acesso para dispositivos móveis
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Se não for dispositivo móvel ou não tiver cabeçalho de autorização, continuar
    if (!req.isMobile || !req.headers.authorization) {
      return next();
    }

    try {
      // Extrair token do cabeçalho Authorization
      const token = req.headers.authorization.split(' ')[1];
      
      if (!token) {
        return next();
      }

      // Verificar token
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedUser;
      
      // Adicionar usuário ao request para uso posterior
      req.user = { id: decoded.id, role: decoded.role };
      
      return next();
    } catch (error) {
      // Em caso de erro, continuar sem autenticar
      // A rota pode então decidir se requer autenticação
      return next();
    }
  });
}

// Estender o tipo Request para incluir propriedades personalizadas
declare global {
    namespace Express {
      interface Request {
        isMobile?: boolean;
        user?: {
          id: number;
          role: string;
        };
      }
    }
}