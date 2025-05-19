// Configurações para os cookies e sessões
export const cookieConfig = {
  // Configurações para o cookie de acesso
  accessCookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 4 * 60 * 60 * 1000 // 4 horas
  },
  
  // Configurações para o cookie de refresh
  refreshCookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
  },
  
  // Configurações para a sessão
  session: {
    cookie: {
      maxAge: 4 * 60 * 60 * 1000 // 4 horas
    }
  }
};