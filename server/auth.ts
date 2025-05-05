import { Request, Response, NextFunction, Express, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { db } from './db';
import { users, refreshTokens, InsertRefreshToken, User } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// Definir secrets reais em variáveis de ambiente para produção
const JWT_SECRET = process.env.JWT_SECRET || 'content-crush-jwt-secret-key-2025';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'content-crush-refresh-secret-key-2025';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'content-crush-encryption-key-32chars!';

/**
 * Configurações de cookie otimizadas para funcionar em dispositivos móveis
 */
function getAccessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 15 * 60 * 1000, // 15 minutos
    sameSite: 'lax',
    path: '/'
  };
}

function getRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    sameSite: 'lax',
    path: '/api/auth/refresh'
  };
}

// Constantes para tokens
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 dias

// Interface para payload do token JWT
interface JwtPayload {
  userId: number;
  role: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

/**
 * Função auxiliar para gerar hash de senha
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Comparar senha com hash armazenado
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Gerar token JWT
 */
export function generateAccessToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    role: user.role,
    permissions: user.permissions as string[] || []
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Gerar token de refresh
 */
export function generateRefreshToken(user: User, ipAddress?: string, userAgent?: string): string {
  const token = crypto.randomBytes(40).toString('hex');
  
  return token;
}

/**
 * Salvar token de refresh no banco de dados
 */
export async function saveRefreshToken(userId: number, token: string, ipAddress?: string, userAgent?: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias
  
  const refreshToken: InsertRefreshToken = {
    user_id: userId,
    token,
    expires_at: expiresAt,
    revoked: false,
    ip_address: ipAddress,
    user_agent: userAgent
  };
  
  await db.insert(refreshTokens).values(refreshToken);
}

/**
 * Revogar token de refresh 
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  await db.update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.token, token));
}

/**
 * Verificar validade do token de refresh
 */
export async function verifyRefreshToken(token: string): Promise<User | null> {
  const [refreshToken] = await db.select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, token),
        eq(refreshTokens.revoked, false),
        sql`${refreshTokens.expires_at} > NOW()`
      )
    );
  
  if (!refreshToken) {
    return null;
  }
  
  const [user] = await db.select()
    .from(users)
    .where(
      and(
        eq(users.id, refreshToken.user_id),
        eq(users.is_active, true)
      )
    );
  
  return user || null;
}

/**
 * Middleware para verificar autenticação via JWT
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Verificar primeiro no cookie
  let token = req.cookies.accessToken;
  
  // Se não houver token no cookie, verificar no cabeçalho Authorization
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    const parts = authHeader.split(' ');
    
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
      console.log('[Auth] Token encontrado no cabeçalho Authorization');
    }
  } else if (token) {
    console.log('[Auth] Token encontrado nos cookies');
  }
  
  if (!token) {
    console.log('[Auth] Token não encontrado');
    return res.status(401).json({ message: 'Token de acesso não fornecido' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { id: decoded.userId, role: decoded.role, permissions: decoded.permissions };
    console.log(`[Auth] Token verificado para usuário ID: ${decoded.userId}, role: ${decoded.role}`);
    next();
  } catch (err) {
    console.error('[Auth] Erro ao verificar token:', err);
    return res.status(403).json({ message: 'Token inválido ou expirado' });
  }
}

/**
 * Middleware para verificar permissões baseadas em função
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'Acesso negado: você não tem permissão para acessar este recurso' 
    });
  };
}

/**
 * Middleware para verificar permissões específicas
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    
    if (req.user.role === 'admin') {
      return next(); // Admin tem todas as permissões
    }
    
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }
    
    return res.status(403).json({ 
      message: `Acesso negado: permissão "${permission}" necessária` 
    });
  };
}

/**
 * Criptografar dados usando AES-256-CBC
 */
export function encryptData(data: string): { encryptedData: string, iv: string } {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex')
  };
}

/**
 * Descriptografar dados usando AES-256-CBC
 */
export function decryptData(encryptedData: string, iv: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Configurar middleware de autenticação para a aplicação
 */
export function setupAuth(app: Express) {
  app.use(cookieParser());
  
  // Adicionar middleware para decodificar tokens JWT
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Verificar primeiro no cookie
    let token = req.cookies.accessToken;
    
    // Se não houver token no cookie, verificar no cabeçalho Authorization
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      const parts = authHeader.split(' ');
      
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }
    
    if (!token) {
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.user = { id: decoded.userId, role: decoded.role, permissions: decoded.permissions };
    } catch (err) {
      // Token inválido, continue sem definir req.user
    }
    
    next();
  });
  
  // Rotas de autenticação
  
  // Registrar novo usuário
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { username, email, password, name } = req.body;
      
      // Verificar se usuário já existe
      const existingUser = await db.select()
        .from(users)
        .where(
          sql`${users.username} = ${username} OR ${users.email} = ${email}`
        );
      
      if (existingUser.length > 0) {
        return res.status(409).json({ message: 'Usuário ou email já existem' });
      }
      
      // Hash da senha
      const hashedPassword = await hashPassword(password);
      
      // Inserir usuário
      const [user] = await db.insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          name,
          role: 'viewer', // Papel padrão
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();
      
      // Gerar tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(
        user, 
        req.ip, 
        req.headers['user-agent']
      );
      
      // Salvar refresh token
      await saveRefreshToken(
        user.id, 
        refreshToken,
        req.ip,
        req.headers['user-agent']
      );
      
      // Configurar cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60 * 1000 // 15 minutos
      });
      
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/api/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
      });
      
      // Retornar usuário sem a senha
      const { password: _, ...userWithoutPassword } = user;
      
      return res.status(201).json({
        user: userWithoutPassword,
        token: accessToken
      });
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      // Buscar usuário
      const [user] = await db.select()
        .from(users)
        .where(
          sql`${users.username} = ${username} OR ${users.email} = ${username}`
        );
      
      if (!user) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
      
      // Verificar se a conta está ativa
      if (!user.is_active) {
        return res.status(403).json({ message: 'Conta desativada' });
      }
      
      // Verificar senha
      const passwordValid = await comparePassword(password, user.password);
      
      if (!passwordValid) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
      
      // Atualizar último login
      await db.update(users)
        .set({ last_login: new Date() })
        .where(eq(users.id, user.id));
      
      // Gerar tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(
        user, 
        req.ip, 
        req.headers['user-agent']
      );
      
      // Salvar refresh token
      await saveRefreshToken(
        user.id, 
        refreshToken,
        req.ip,
        req.headers['user-agent']
      );
      
      // Configurar cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60 * 1000 // 15 minutos
      });
      
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/api/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
      });
      
      // Retornar usuário sem a senha
      const { password: _, ...userWithoutPassword } = user;
      
      return res.status(200).json({
        user: userWithoutPassword,
        token: accessToken
      });
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Logout
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (refreshToken) {
        // Revogar refresh token
        await revokeRefreshToken(refreshToken);
      }
      
      // Limpar cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      
      return res.status(200).json({ message: 'Logout bem-sucedido' });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Refresh do token
  app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token não fornecido' });
      }
      
      // Verificar se o token de refresh é válido
      const user = await verifyRefreshToken(refreshToken);
      
      if (!user) {
        // Limpar cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
        
        return res.status(403).json({ message: 'Refresh token inválido ou expirado' });
      }
      
      // Revogar refresh token atual
      await revokeRefreshToken(refreshToken);
      
      // Gerar novos tokens
      const accessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(
        user, 
        req.ip, 
        req.headers['user-agent']
      );
      
      // Salvar novo refresh token
      await saveRefreshToken(
        user.id, 
        newRefreshToken,
        req.ip,
        req.headers['user-agent']
      );
      
      // Configurar cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60 * 1000 // 15 minutos
      });
      
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/api/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
      });
      
      return res.status(200).json({ token: accessToken });
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
  
  // Obter usuário atual
  app.get('/api/auth/me', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      // Retornar usuário sem a senha
      const { password, ...userWithoutPassword } = user;
      
      // Gerar um novo token para garantir que ele esteja atualizado
      const accessToken = generateAccessToken(user);
      
      return res.status(200).json({
        user: userWithoutPassword,
        token: accessToken
      });
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
}

// Estender a interface Request para incluir o usuário
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: string;
        permissions?: string[];
      };
    }
  }
}