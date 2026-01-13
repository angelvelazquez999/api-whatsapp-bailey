// Configuración centralizada de la aplicación

export const config = {
  // Puerto del servidor Express
  PORT: process.env.PORT || 3000,
  
  // Directorio donde se guardan las sesiones de WhatsApp
  SESSIONS_DIR: './sessions',
  
  // Nombre de la sesión (útil si quieres múltiples instancias)
  SESSION_NAME: process.env.SESSION_NAME || 'whatsapp-session',
  
  // Nivel de logs: silent, fatal, error, warn, info, debug, trace
  LOG_LEVEL: process.env.LOG_LEVEL || 'silent'
};
