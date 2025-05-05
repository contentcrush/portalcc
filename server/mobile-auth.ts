import { Request, Response, Express } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from './db';
import { users, refreshTokens, insertUserSchema } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword, generateAccessToken, generateRefreshToken, saveRefreshToken } from './auth';
import { z } from 'zod';

// Definir secrets reais em variáveis de ambiente para produção
const JWT_SECRET = process.env.JWT_SECRET || 'content-crush-jwt-secret-key-2025';

// Configuração específica para dispositivos móveis
export function setupMobileAuth(app: Express) {
  // Endpoint para login via dispositivo móvel - retorna apenas token, sem cookies
  app.post('/api/auth/mobile/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      // Registrar solicitação para depuração
      console.log(`[Mobile Auth] Tentativa de login para usuário: ${username}`);
      
      // Buscar usuário
      const [user] = await db.select()
        .from(users)
        .where(
          sql`${users.username} = ${username} OR ${users.email} = ${username}`
        );
      
      if (!user) {
        console.log('[Mobile Auth] Usuário não encontrado');
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
      
      // Verificar se a conta está ativa
      if (!user.is_active) {
        console.log('[Mobile Auth] Conta desativada');
        return res.status(403).json({ message: 'Conta desativada' });
      }
      
      // Verificar senha
      const passwordValid = await bcrypt.compare(password, user.password);
      
      if (!passwordValid) {
        console.log('[Mobile Auth] Senha inválida');
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
      
      console.log(`[Mobile Auth] Login bem-sucedido para usuário: ${username}`);
      
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
      
      // Retornar tokens no corpo da resposta sem configurar cookies
      const { password: _, ...userWithoutPassword } = user;
      
      return res.status(200).json({
        user: userWithoutPassword,
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('[Mobile Auth] Erro ao fazer login:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Endpoint para validar token JWT (útil para verificar token em dispositivos móveis)
  app.post('/api/auth/mobile/validate', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ valid: false, message: 'Token não fornecido' });
      }
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        
        // Verificar se o usuário existe e está ativo
        const [user] = await db.select()
          .from(users)
          .where(eq(users.id, decoded.userId));
        
        if (!user || !user.is_active) {
          return res.status(200).json({ valid: false, message: 'Usuário inválido ou inativo' });
        }
        
        return res.status(200).json({ valid: true });
      } catch (jwtError) {
        return res.status(200).json({ valid: false, message: 'Token inválido ou expirado' });
      }
    } catch (error) {
      console.error('[Mobile Auth] Erro ao validar token:', error);
      return res.status(500).json({ valid: false, message: 'Erro interno do servidor' });
    }
  });

  // Endpoint para atualizar token (refresh) - específico para dispositivos móveis
  app.post('/api/auth/mobile/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token não fornecido' });
      }
      
      // Verificar se o token existe e não foi revogado
      const [token] = await db.select()
        .from(refreshTokens)
        .where(
          sql`${refreshTokens.token} = ${refreshToken} 
          AND ${refreshTokens.revoked} = false 
          AND ${refreshTokens.expires_at} > NOW()`
        );
      
      if (!token) {
        return res.status(401).json({ message: 'Refresh token inválido ou expirado' });
      }
      
      // Buscar usuário
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, token.user_id));
      
      if (!user || !user.is_active) {
        return res.status(401).json({ message: 'Usuário inválido ou inativo' });
      }
      
      // Revogar token atual
      await db.update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.token, refreshToken));
      
      // Gerar novos tokens
      const newAccessToken = generateAccessToken(user);
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
      
      return res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      console.error('[Mobile Auth] Erro ao atualizar token:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Endpoint para registro de usuário via dispositivo móvel
  app.post('/api/auth/mobile/register', async (req: Request, res: Response) => {
    try {
      console.log('[Mobile Auth] Tentativa de registro com dados:', { ...req.body, password: '***' });
      
      // Validar dados usando schema Zod
      try {
        const userData = insertUserSchema.parse(req.body);
        console.log('[Mobile Auth] Dados validados para registro');
        
        // Verificar se username ou email já existem
        const existingUser = await db.select()
          .from(users)
          .where(
            sql`${users.username} = ${userData.username} OR ${users.email} = ${userData.email}`
          );
        
        if (existingUser.length > 0) {
          console.log('[Mobile Auth] Usuário ou email já existem');
          return res.status(400).json({ 
            message: 'Nome de usuário ou email já estão em uso' 
          });
        }
        
        // Hash da senha
        const hashedPassword = await hashPassword(userData.password);
        
        // Inserir no banco de dados com valores específicos
        const [createdUser] = await db.insert(users)
          .values({
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
            name: userData.name,
            role: "viewer", // Papel padrão para novos usuários
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            last_login: new Date(),
            // Outros campos opcionais
            user_type: userData.user_type || null,
            document: userData.document || null,
            phone: userData.phone || null,
            mobile_phone: userData.mobile_phone || null,
            website: userData.website || null,
            address: userData.address || null,
            area: userData.area || null
          })
          .returning();
        
        if (!createdUser) {
          console.error('[Mobile Auth] Falha ao criar usuário');
          return res.status(500).json({ message: 'Erro ao criar usuário' });
        }
        
        console.log(`[Mobile Auth] Usuário registrado com sucesso: ${createdUser.username}`);
        
        // Gerar tokens
        const accessToken = generateAccessToken(createdUser);
        const refreshToken = generateRefreshToken(
          createdUser, 
          req.ip, 
          req.headers['user-agent']
        );
        
        // Salvar refresh token
        await saveRefreshToken(
          createdUser.id, 
          refreshToken,
          req.ip,
          req.headers['user-agent']
        );
        
        // Retornar dados sem a senha
        const { password: _, ...userWithoutPassword } = createdUser;
        
        return res.status(201).json({
          user: userWithoutPassword,
          accessToken,
          refreshToken
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.error('[Mobile Auth] Erro de validação:', validationError.errors);
          return res.status(400).json({ 
            message: 'Dados de registro inválidos', 
            errors: validationError.errors 
          });
        }
        throw validationError;
      }
    } catch (error) {
      console.error('[Mobile Auth] Erro ao registrar usuário:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Endpoint para logout em dispositivos móveis (revogação de tokens)
  app.post('/api/auth/mobile/logout', async (req: Request, res: Response) => {
    try {
      // Obter token do cabeçalho de autorização
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        console.log('[Mobile Auth] Tentativa de logout sem token');
        return res.status(200).json({ message: 'Logout bem-sucedido' });
      }
      
      try {
        // Verificar se o token é válido
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        
        // Revogar todos os refresh tokens do usuário
        await db.update(refreshTokens)
          .set({ revoked: true })
          .where(eq(refreshTokens.user_id, decoded.userId));
        
        console.log(`[Mobile Auth] Tokens revogados para usuário ID: ${decoded.userId}`);
      } catch (error) {
        // Mesmo se o token for inválido, consideramos o logout bem-sucedido
        const jwtError = error as Error;
        console.log('[Mobile Auth] Token inválido durante logout:', jwtError.message);
      }
      
      return res.status(200).json({ message: 'Logout bem-sucedido' });
    } catch (error) {
      console.error('[Mobile Auth] Erro durante logout:', error);
      // Ainda retornamos sucesso mesmo em caso de erro, para garantir que o cliente saia
      return res.status(200).json({ message: 'Logout processado' });
    }
  });
}