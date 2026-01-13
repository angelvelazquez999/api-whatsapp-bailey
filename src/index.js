// Punto de entrada de la aplicación
import express from 'express';
import { config } from './config/index.js';
import { initWhatsApp } from './services/whatsapp.js';
import whatsappRoutes from './routes/whatsapp.js';

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Middleware de logging básico
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas de WhatsApp
app.use('/', whatsappRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('[API] Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Iniciar servidor y WhatsApp
async function start() {
  try {
    console.log('='.repeat(50));
    console.log('  Baileys WhatsApp API');
    console.log('='.repeat(50));
    
    // Iniciar conexión con WhatsApp
    console.log('[App] Iniciando conexión con WhatsApp...');
    await initWhatsApp();
    
    // Iniciar servidor Express
    app.listen(config.PORT, () => {
      console.log(`[App] Servidor corriendo en http://localhost:${config.PORT}`);
      console.log('');
      console.log('Endpoints disponibles:');
      console.log(`  GET  /health       - Health check`);
      console.log(`  GET  /status       - Estado de WhatsApp`);
      console.log(`  GET  /qr           - Código QR para vincular`);
      console.log(`  POST /send-message - Enviar mensaje`);
      console.log('');
    });
    
  } catch (error) {
    console.error('[App] Error fatal:', error);
    process.exit(1);
  }
}

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n[App] Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[App] Cerrando servidor...');
  process.exit(0);
});

// Iniciar aplicación
start();
