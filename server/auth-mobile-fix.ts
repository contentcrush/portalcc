import { Request, Response, NextFunction, Express } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, refreshTokens } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { authenticateJWT } from './auth';

const JWT_SECRET = process.env.JWT_SECRET || 'content-crush-jwt-secret-key-2025';

/**
 * Função utilitária para configurar cookies com suporte aprimorado para dispositivos móveis
 */
function setCookies(res: Response, accessToken: string, refreshToken: string) {
  // Configurar cookie do token de acesso com melhor compatibilidade mobile
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Importante para compatibilidade com navegadores móveis
    maxAge: 15 * 60 * 1000, // 15 minutos
    path: '/' // Acessível em todo o site
  });
  
  // Configurar cookie do token de refresh com melhor compatibilidade mobile
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Importante para compatibilidade com navegadores móveis
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
  });
}

/**
 * Configura middleware para compatibilidade melhorada com dispositivos móveis
 */
export function setupMobileAuth(app: Express) {
  // Garantir que cookieParser esteja instalado
  app.use(cookieParser());
  
  // Middleware para detectar dispositivos móveis e ajustar comportamento
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /mobile|android|iphone|ipod|ipad/i.test(userAgent);
    
    // Armazenar a informação se é dispositivo móvel para uso em outros middlewares
    req.isMobile = isMobile;
    
    // Continue para o próximo middleware
    next();
  });
  
  // Nova rota para atualizar token otimizada para dispositivos móveis
  app.post('/api/auth/mobile-refresh', async (req: Request, res: Response) => {
    try {
      // Tentar obter o refresh token do cookie primeiro
      let refreshToken = req.cookies.refreshToken;
      
      // Se não encontrado no cookie, tentar obter do corpo da requisição (fallback para mobile)
      if (!refreshToken && req.body.refreshToken) {
        refreshToken = req.body.refreshToken;
      }
      
      if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token não fornecido' });
      }
      
      // Verificar se o token de refresh é válido
      const [refreshTokenRecord] = await db.select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, refreshToken));
      
      if (!refreshTokenRecord || refreshTokenRecord.revoked || new Date() > refreshTokenRecord.expires_at) {
        return res.status(403).json({ message: 'Token inválido ou expirado' });
      }
      
      // Obter usuário
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, refreshTokenRecord.user_id));
      
      if (!user || !user.is_active) {
        return res.status(403).json({ message: 'Usuário não encontrado ou inativo' });
      }
      
      // Gerar novo access token
      const payload = {
        userId: user.id,
        role: user.role,
        permissions: user.permissions as string[] || []
      };
      
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
      
      // Configurar cookies com melhor compatibilidade mobile
      setCookies(res, accessToken, refreshToken);
      
      // Para dispositivos móveis, também retornar os tokens no corpo da resposta
      if (req.isMobile) {
        return res.status(200).json({
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role
          },
          accessToken,
          refreshToken
        });
      }
      
      // Para navegadores desktop, retornar apenas o token normal (cookies já foram configurados)
      return res.status(200).json({ token: accessToken });
    } catch (error) {
      console.error('[MobileAuth] Erro ao atualizar token:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Nova rota de login otimizada para mobile
  app.post('/api/auth/mobile-login', async (req: Request, res: Response) => {
    try {
      // Processa o login normalmente usando a rota existente
      const response = await new Promise<any>((resolve, reject) => {
        // Armazenamos a função original de resposta
        const originalSend = res.send;
        
        // Sobrescrevemos temporariamente a função de resposta
        res.send = function(body) {
          // Restauramos a função original
          res.send = originalSend;
          
          // Resolvemos a promise com os dados da resposta
          resolve(typeof body === 'string' ? JSON.parse(body) : body);
          
          // Para não enviar a resposta ainda, retornamos res para encadear
          return res;
        };
        
        // Chamamos o manipulador de login existente
        app._router.handle(req, res, (err) => {
          if (err) reject(err);
        });
      });
      
      // Para dispositivos móveis, também adicionamos os tokens no localStorage
      if (req.isMobile) {
        // Implementar rotina para garantir que o dispositivo móvel tenha uma cópia dos tokens
        const accessToken = req.cookies.accessToken;
        const refreshToken = req.cookies.refreshToken;
        
        return res.status(200).json({
          ...response,
          // Adicionar opção para o cliente armazenar em localStorage como fallback
          accessToken,
          refreshToken,
          expiresIn: 15 * 60, // 15 minutos em segundos
          tokenType: 'Bearer'
        });
      }
      
      // Para navegadores desktop, a resposta já foi enviada pela rota original
      // Não precisamos fazer nada
    } catch (error) {
      console.error('[MobileAuth] Erro ao fazer login mobile:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Expandir o middleware existente para verificar tokens no localStorage para mobile
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Se já estamos autenticados pelo middleware padrão, continuar
    if (req.user) {
      return next();
    }
    
    // Verificar se é uma solicitação de dispositivo móvel com token no cabeçalho Authorization
    const authHeader = req.headers.authorization;
    if (req.isMobile && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = { 
          id: decoded.userId, 
          role: decoded.role, 
          permissions: decoded.permissions 
        };
        
        // Log para debugging
        console.log(`[MobileAuth] Autenticado via token Bearer: user ${decoded.userId}`);
      } catch (err) {
        // Token inválido, não definimos req.user
        console.log('[MobileAuth] Token Bearer inválido');
      }
    }
    
    // Continuar para o próximo middleware
    next();
  });
}

// Estender as interfaces para incluir as propriedades adicionadas
declare global {
  namespace Express {
    interface Request {
      isMobile?: boolean;
    }
  }
}