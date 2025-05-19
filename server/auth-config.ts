// Configurações globais para autenticação
export const AUTH_CONFIG = {
  // Cookies e tokens
  ACCESS_TOKEN_EXPIRY: '4h', // 4 horas
  REFRESH_TOKEN_EXPIRY: '30d', // 30 dias
  
  // Duração de cookies em milissegundos
  ACCESS_TOKEN_COOKIE_MAX_AGE: 4 * 60 * 60 * 1000, // 4 horas
  REFRESH_TOKEN_COOKIE_MAX_AGE: 30 * 24 * 60 * 60 * 1000, // 30 dias
  
  // Outras configurações
  SALT_ROUNDS: 10,
  
  // Configuração de sessão
  SESSION_EXPIRY: 4 * 60 * 60 * 1000 // 4 horas
};