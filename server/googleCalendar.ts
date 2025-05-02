import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from './db';
import { events, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Configuração com as credenciais do Google Cloud Project
// Esses valores devem ser configurados como variáveis de ambiente
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5000/api/google/callback';

// Escopos necessários para o acesso ao Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Cria uma instância do cliente OAuth2
 */
export function getOAuth2Client(): OAuth2Client {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Credenciais do Google não configuradas. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.');
  }
  
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

/**
 * Gera uma URL de autorização para o usuário
 * @param userId ID do usuário que está fazendo login
 * @returns URL para autorização do Google
 */
export function getAuthUrl(userId: number): string {
  const oauth2Client = getOAuth2Client();
  
  // Incluindo o userId no state para recuperar na callback
  const state = JSON.stringify({ userId });
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent' // Solicita permissão todas as vezes para garantir que gere refresh_token
  });
}

/**
 * Processa o código de autorização retornado pelo Google
 * @param code Código de autorização
 * @param state Estado que foi enviado na solicitação
 * @returns Tokens de acesso e atualização
 */
export async function handleAuthCallback(code: string, state: string): Promise<any> {
  const oauth2Client = getOAuth2Client();
  
  try {
    // Troca o código pelo token de acesso
    const { tokens } = await oauth2Client.getToken(code);
    
    // Extraindo o userId do state
    const stateData = JSON.parse(state);
    const userId = stateData.userId;
    
    // Salvar os tokens do usuário na base de dados
    await saveUserTokens(userId, tokens);
    
    return tokens;
  } catch (error) {
    console.error('Erro ao obter tokens do Google:', error);
    throw error;
  }
}

/**
 * Salva os tokens de acesso e atualização do usuário
 * @param userId ID do usuário
 * @param tokens Tokens OAuth2
 */
async function saveUserTokens(userId: number, tokens: any): Promise<void> {
  try {
    // Atualiza os campos no usuário
    await db.update(users)
      .set({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        google_calendar_connected: true
      })
      .where(eq(users.id, userId));
      
    console.log(`Tokens do Google salvos para o usuário ${userId}`);
  } catch (error) {
    console.error('Erro ao salvar tokens do usuário:', error);
    throw error;
  }
}

/**
 * Obtém um cliente OAuth2 autenticado para o usuário
 * @param userId ID do usuário
 * @returns Cliente OAuth2 autenticado
 */
export async function getAuthenticatedClient(userId: number): Promise<OAuth2Client> {
  try {
    // Busca o usuário com os tokens
    const [user] = await db.select({
      access_token: users.google_access_token,
      refresh_token: users.google_refresh_token,
      token_expiry: users.google_token_expiry
    })
    .from(users)
    .where(eq(users.id, userId));
    
    if (!user || !user.access_token) {
      throw new Error('Usuário não autenticado com o Google Calendar');
    }
    
    const oauth2Client = getOAuth2Client();
    
    // Configura os tokens existentes
    oauth2Client.setCredentials({
      access_token: user.access_token,
      refresh_token: user.refresh_token,
      expiry_date: user.token_expiry ? user.token_expiry.getTime() : undefined
    });
    
    return oauth2Client;
  } catch (error) {
    console.error(`Erro ao obter cliente autenticado para usuário ${userId}:`, error);
    throw error;
  }
}

/**
 * Verifica o status da conexão do Google Calendar para um usuário
 * @param userId ID do usuário
 * @returns Status da conexão
 */
export async function getConnectionStatus(userId: number): Promise<{ connected: boolean, email?: string }> {
  try {
    const [user] = await db.select({
      connected: users.google_calendar_connected,
      email: users.google_calendar_email
    })
    .from(users)
    .where(eq(users.id, userId));
    
    return {
      connected: user?.connected || false,
      email: user?.email
    };
  } catch (error) {
    console.error(`Erro ao verificar status da conexão para o usuário ${userId}:`, error);
    return { connected: false };
  }
}

/**
 * Sincroniza um evento do sistema com o Google Calendar
 * @param eventId ID do evento no sistema
 * @param userId ID do usuário
 * @returns Evento criado/atualizado no Google Calendar
 */
export async function syncEventToGoogleCalendar(eventId: number, userId: number): Promise<any> {
  try {
    // Obtém o evento do sistema
    const [systemEvent] = await db.select()
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!systemEvent) {
      throw new Error(`Evento com ID ${eventId} não encontrado`);
    }
    
    // Obtém o cliente autenticado
    const oauth2Client = await getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Mapeia o evento do sistema para o formato do Google Calendar
    const googleEvent = {
      summary: systemEvent.title,
      description: systemEvent.description,
      start: {
        dateTime: systemEvent.all_day 
          ? undefined 
          : systemEvent.start_date.toISOString(),
        date: systemEvent.all_day 
          ? systemEvent.start_date.toISOString().split('T')[0] 
          : undefined,
      },
      end: {
        dateTime: systemEvent.all_day 
          ? undefined 
          : systemEvent.end_date.toISOString(),
        date: systemEvent.all_day 
          ? systemEvent.end_date.toISOString().split('T')[0] 
          : undefined,
      },
      colorId: getGoogleCalendarColorId(systemEvent.color),
      location: systemEvent.location,
      // Campo para armazenar o ID do evento no nosso sistema
      extendedProperties: {
        private: {
          systemEventId: eventId.toString(),
        },
      },
    };

    let result;
    
    // Verifica se já existe um ID do Google Calendar para este evento
    if (systemEvent.google_calendar_id) {
      // Atualiza o evento existente
      result = await calendar.events.update({
        calendarId: 'primary',
        eventId: systemEvent.google_calendar_id,
        requestBody: googleEvent,
      });
    } else {
      // Cria um novo evento
      result = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: googleEvent,
      });
      
      // Armazena o ID do Google Calendar no nosso sistema
      if (result.data.id) {
        await db.update(events)
          .set({ google_calendar_id: result.data.id })
          .where(eq(events.id, eventId));
      }
    }
    
    return result.data;
  } catch (error) {
    console.error(`Erro ao sincronizar evento ${eventId} com Google Calendar:`, error);
    throw error;
  }
}

/**
 * Obtém eventos do Google Calendar do usuário
 * @param userId ID do usuário
 * @returns Lista de eventos do Google Calendar
 */
export async function getGoogleCalendarEvents(userId: number): Promise<any[]> {
  try {
    // Obtém o cliente autenticado
    const oauth2Client = await getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Define o intervalo de tempo para buscar eventos (30 dias antes e depois)
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 30);
    
    // Busca eventos do calendário primário do usuário
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return response.data.items || [];
  } catch (error) {
    console.error(`Erro ao obter eventos do Google Calendar para o usuário ${userId}:`, error);
    throw error;
  }
}

/**
 * Remove um evento do Google Calendar
 * @param eventId ID do evento no sistema
 * @param userId ID do usuário
 * @returns Status da operação
 */
export async function deleteGoogleCalendarEvent(eventId: number, userId: number): Promise<boolean> {
  try {
    // Obtém o evento do sistema
    const [systemEvent] = await db.select({ google_calendar_id: events.google_calendar_id })
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!systemEvent || !systemEvent.google_calendar_id) {
      return false; // Evento não existe ou não tem ID do Google Calendar
    }
    
    // Obtém o cliente autenticado
    const oauth2Client = await getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Remove o evento do Google Calendar
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: systemEvent.google_calendar_id,
    });
    
    // Limpa o ID do Google Calendar no nosso sistema
    await db.update(events)
      .set({ google_calendar_id: null })
      .where(eq(events.id, eventId));
    
    return true;
  } catch (error) {
    console.error(`Erro ao remover evento ${eventId} do Google Calendar:`, error);
    return false;
  }
}

/**
 * Sincroniza todos os eventos do sistema para o Google Calendar de um usuário
 * @param userId ID do usuário
 * @returns Contagem de eventos sincronizados
 */
export async function syncAllEventsToGoogleCalendar(userId: number): Promise<{ success: boolean, count: number }> {
  try {
    // Busca todos os eventos do sistema que são relevantes
    const systemEvents = await db.select({ id: events.id })
      .from(events)
      .where(eq(events.user_id, userId));
    
    let syncCount = 0;
    
    // Sincroniza cada evento
    for (const event of systemEvents) {
      try {
        await syncEventToGoogleCalendar(event.id, userId);
        syncCount++;
      } catch (error) {
        console.error(`Erro ao sincronizar evento ${event.id}:`, error);
        // Continua para o próximo evento mesmo se este falhar
      }
    }
    
    return { success: true, count: syncCount };
  } catch (error) {
    console.error(`Erro ao sincronizar todos os eventos para o usuário ${userId}:`, error);
    return { success: false, count: 0 };
  }
}

/**
 * Mapeia a cor do evento no sistema para o ID de cor do Google Calendar
 * @param color Valor hexadecimal da cor no sistema
 * @returns ID da cor no Google Calendar
 */
function getGoogleCalendarColorId(color?: string): string {
  if (!color) return '1'; // Azul (padrão)
  
  // Mapeamento aproximado de cores hexadecimais para IDs do Google Calendar
  // https://developers.google.com/calendar/api/v3/reference/colors/get
  const colorMap: Record<string, string> = {
    '#4f46e5': '7', // Azul - aniversários de clientes
    '#6366f1': '7', // Indigo - eventos de projeto
    '#ec4899': '3', // Rosa - eventos sociais 
    '#ef4444': '11', // Vermelho - prazos/pagamentos
    '#10b981': '2', // Verde - recebimentos
    '#a855f7': '9', // Roxo - lembretes
  };
  
  // Busca a cor mais próxima
  for (const [hex, id] of Object.entries(colorMap)) {
    if (color.toLowerCase() === hex.toLowerCase()) {
      return id;
    }
  }
  
  return '1'; // Azul (padrão) se não encontrar correspondência
}

/**
 * Desconecta a conta do Google Calendar de um usuário
 * @param userId ID do usuário
 * @returns Status da operação
 */
export async function disconnectGoogleCalendar(userId: number): Promise<boolean> {
  try {
    await db.update(users)
      .set({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
        google_calendar_connected: false,
        google_calendar_email: null
      })
      .where(eq(users.id, userId));
    
    return true;
  } catch (error) {
    console.error(`Erro ao desconectar Google Calendar para o usuário ${userId}:`, error);
    return false;
  }
}