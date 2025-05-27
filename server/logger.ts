import { format } from 'date-fns';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  userId?: number;
  requestId?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Manter últimos 1000 logs
  private currentLevel = LogLevel.INFO;

  private formatTimestamp(): string {
    return format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS');
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output com cores
    this.outputToConsole(entry);
  }

  private outputToConsole(entry: LogEntry): void {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m',    // Ciano
      [LogLevel.INFO]: '\x1b[32m',     // Verde
      [LogLevel.WARN]: '\x1b[33m',     // Amarelo
      [LogLevel.ERROR]: '\x1b[31m',    // Vermelho
      [LogLevel.CRITICAL]: '\x1b[41m', // Fundo vermelho
    };

    const reset = '\x1b[0m';
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    
    const color = colors[entry.level];
    const levelName = levelNames[entry.level];
    
    let output = `${color}[${entry.timestamp}] ${levelName} [${entry.category}]${reset} ${entry.message}`;
    
    if (entry.userId) {
      output += ` (User: ${entry.userId})`;
    }
    
    if (entry.requestId) {
      output += ` (Request: ${entry.requestId})`;
    }

    console.log(output);
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console.log(`${color}  Metadata:${reset}`, JSON.stringify(entry.metadata, null, 2));
    }
    
    if (entry.error) {
      console.error(`${color}  Error:${reset}`, entry.error.message);
      if (entry.error.stack) {
        console.error(`${color}  Stack:${reset}`, entry.error.stack);
      }
    }
  }

  debug(category: string, message: string, metadata?: Record<string, any>): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: LogLevel.DEBUG,
        category,
        message,
        metadata
      });
    }
  }

  info(category: string, message: string, metadata?: Record<string, any>): void {
    if (this.currentLevel <= LogLevel.INFO) {
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: LogLevel.INFO,
        category,
        message,
        metadata
      });
    }
  }

  warn(category: string, message: string, metadata?: Record<string, any>): void {
    if (this.currentLevel <= LogLevel.WARN) {
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: LogLevel.WARN,
        category,
        message,
        metadata
      });
    }
  }

  error(category: string, message: string, error?: Error, metadata?: Record<string, any>): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      this.addLog({
        timestamp: this.formatTimestamp(),
        level: LogLevel.ERROR,
        category,
        message,
        error,
        metadata
      });
    }
  }

  critical(category: string, message: string, error?: Error, metadata?: Record<string, any>): void {
    this.addLog({
      timestamp: this.formatTimestamp(),
      level: LogLevel.CRITICAL,
      category,
      message,
      error,
      metadata
    });
  }

  // Métodos específicos para contextos
  api(method: string, endpoint: string, status: number, duration?: number, userId?: number): void {
    const message = `${method} ${endpoint} - ${status}`;
    const metadata = { method, endpoint, status, duration, userId };
    
    if (status >= 500) {
      this.error('API', message, undefined, metadata);
    } else if (status >= 400) {
      this.warn('API', message, metadata);
    } else {
      this.info('API', message, metadata);
    }
  }

  auth(action: string, userId?: number, success: boolean = true, details?: string): void {
    const message = `${action} - ${success ? 'SUCCESS' : 'FAILED'}${details ? `: ${details}` : ''}`;
    const metadata = { action, userId, success, details };
    
    if (success) {
      this.info('AUTH', message, metadata);
    } else {
      this.warn('AUTH', message, metadata);
    }
  }

  database(operation: string, table?: string, duration?: number, error?: Error): void {
    const message = `${operation}${table ? ` on ${table}` : ''}${duration ? ` (${duration}ms)` : ''}`;
    const metadata = { operation, table, duration };
    
    if (error) {
      this.error('DATABASE', `${message} - FAILED`, error, metadata);
    } else {
      this.debug('DATABASE', message, metadata);
    }
  }

  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    const message = `${operation} completed in ${duration}ms`;
    const logMetadata = { operation, duration, ...metadata };
    
    if (duration > 5000) {
      this.warn('PERFORMANCE', `SLOW: ${message}`, logMetadata);
    } else if (duration > 1000) {
      this.info('PERFORMANCE', message, logMetadata);
    } else {
      this.debug('PERFORMANCE', message, logMetadata);
    }
  }

  // Buscar logs para análise
  getLogs(filters?: {
    level?: LogLevel;
    category?: string;
    startTime?: Date;
    endTime?: Date;
    userId?: number;
    limit?: number;
  }): LogEntry[] {
    let filtered = [...this.logs];
    
    if (filters) {
      if (filters.level !== undefined) {
        filtered = filtered.filter(log => log.level >= filters.level!);
      }
      
      if (filters.category) {
        filtered = filtered.filter(log => log.category === filters.category);
      }
      
      if (filters.startTime) {
        filtered = filtered.filter(log => new Date(log.timestamp) >= filters.startTime!);
      }
      
      if (filters.endTime) {
        filtered = filtered.filter(log => new Date(log.timestamp) <= filters.endTime!);
      }
      
      if (filters.userId) {
        filtered = filtered.filter(log => log.userId === filters.userId);
      }
      
      if (filters.limit) {
        filtered = filtered.slice(-filters.limit);
      }
    }
    
    return filtered;
  }

  // Estatísticas de logs
  getStats(): Record<string, any> {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      recentErrors: this.logs.filter(log => 
        log.level >= LogLevel.ERROR && 
        new Date(log.timestamp) > new Date(Date.now() - 5 * 60 * 1000) // Últimos 5 minutos
      ).length
    };
    
    this.logs.forEach(log => {
      const levelName = LogLevel[log.level];
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });
    
    return stats;
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
    this.info('LOGGER', `Log level set to ${LogLevel[level]}`);
  }
}

// Instância global
export const logger = new Logger();

// Middleware para Express
export function loggerMiddleware(req: any, res: any, next: any): void {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  req.requestId = requestId;
  req.logger = logger;
  
  // Log da request
  logger.debug('REQUEST', `${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  // Capturar response
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - start;
    logger.api(req.method, req.path, res.statusCode, duration, req.user?.id);
    return originalSend.call(this, data);
  };
  
  next();
}