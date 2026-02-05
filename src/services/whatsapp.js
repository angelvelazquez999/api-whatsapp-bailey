// Servicio principal de WhatsApp usando Baileys
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { mkdir } from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

// Estado de la conexión
let sock = null;
let connectionState = 'disconnected'; // disconnected, connecting, connected
let currentQR = null; // Almacena el QR actual para exponerlo vía API
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Logger silencioso para Baileys (evita spam en consola)
const logger = pino({ level: config.LOG_LEVEL });

/**
 * Inicializa la conexión con WhatsApp
 * - Carga sesión existente o muestra QR
 * - Maneja reconexión automática
 */
export async function initWhatsApp() {
  const sessionPath = path.join(config.SESSIONS_DIR, config.SESSION_NAME);
  
  // Crear directorio de sesiones si no existe
  await mkdir(sessionPath, { recursive: true });
  
  // Cargar estado de autenticación desde archivos
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  
  // Obtener última versión de WhatsApp Web
  const { version } = await fetchLatestBaileysVersion();
  console.log(`[WhatsApp] Usando WA Web v${version.join('.')}`);
  
  // Crear socket de conexión
  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    logger,
    browser: ['Baileys API', 'Chrome', '120.0.0'],
    // Configuración para mantener conexión estable
    keepAliveIntervalMs: 30000,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: undefined,
    emitOwnEvents: false,
    markOnlineOnConnect: false
  });
  
  // Manejar actualizaciones de conexión
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // Guardar QR para exponerlo vía API
    if (qr) {
      currentQR = qr;
      console.log('[WhatsApp] QR generado. Escanéalo en /qr');
    }
    
    if (connection === 'connecting') {
      connectionState = 'connecting';
      console.log('[WhatsApp] Conectando...');
    }
    
    if (connection === 'open') {
      connectionState = 'connected';
      currentQR = null; // Ya no necesitamos el QR
      reconnectAttempts = 0; // Resetear intentos al conectar
      console.log('[WhatsApp] ✓ Conectado exitosamente');
    }
    
    if (connection === 'close') {
      connectionState = 'disconnected';
      currentQR = null; // Limpiar QR viejo
      
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && 
                              statusCode !== DisconnectReason.badSession;
      
      console.log(`[WhatsApp] Conexión cerrada. Código: ${statusCode}`);
      
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('[WhatsApp] Sesión cerrada desde el teléfono. Elimina /sessions y reinicia.');
      } else if (statusCode === DisconnectReason.badSession) {
        console.log('[WhatsApp] Sesión corrupta. Elimina /sessions y reinicia.');
      } else if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(3000 * reconnectAttempts, 30000); // Backoff: 3s, 6s, 9s... max 30s
        console.log(`[WhatsApp] Reconectando en ${delay/1000}s (intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => {
          initWhatsApp();
        }, delay);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('[WhatsApp] Máximo de reconexiones alcanzado. Reinicia el contenedor.');
      }
    }
  });
  
  // Guardar credenciales cuando se actualicen
  sock.ev.on('creds.update', saveCreds);
  
  return sock;
}

/**
 * Obtiene el estado actual de la conexión
 */
export function getConnectionState() {
  return connectionState;
}

/**
 * Verifica si WhatsApp está conectado
 */
export function isConnected() {
  return connectionState === 'connected' && sock !== null;
}

/**
 * Envía un mensaje de texto a un número de WhatsApp
 * @param {string} to - Número de teléfono (ej: 521XXXXXXXXXX)
 * @param {string} message - Mensaje a enviar
 */
export async function sendTextMessage(to, message) {
  if (!isConnected()) {
    throw new Error('WhatsApp no está conectado');
  }
  
  // Limpiar número: remover +, espacios, guiones
  const cleanNumber = to.replace(/[+\s-]/g, '');
  
  // Validar formato del número
  if (!/^\d{10,15}$/.test(cleanNumber)) {
    throw new Error('Número de teléfono inválido. Debe tener entre 10 y 15 dígitos.');
  }
  
  // Convertir a formato WhatsApp (jid)
  const jid = `${cleanNumber}@s.whatsapp.net`;
  
  try {
    // Enviar mensaje
    const result = await sock.sendMessage(jid, { text: message });
    
    console.log(`[WhatsApp] Mensaje enviado a ${cleanNumber}`);
    
    return {
      success: true,
      messageId: result.key.id,
      to: cleanNumber,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[WhatsApp] Error enviando mensaje:`, error.message);
    throw new Error(`Error al enviar mensaje: ${error.message}`);
  }
}

/**
 * Obtiene el código QR actual (null si ya está conectado)
 */
export function getCurrentQR() {
  return currentQR;
}

/**
 * Obtiene el socket actual (para uso avanzado)
 */
export function getSocket() {
  return sock;
}
