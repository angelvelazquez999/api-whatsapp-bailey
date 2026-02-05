// Rutas de la API de WhatsApp
import { Router } from 'express';
import QRCode from 'qrcode';
import { sendTextMessage, getConnectionState, isConnected, getCurrentQR } from '../services/whatsapp.js';

const router = Router();

/**
 * GET /qr
 * Muestra el código QR en el navegador para escanear
 */
router.get('/qr', async (req, res) => {
  const state = getConnectionState();
  
  // Si ya está conectado, no hay QR
  if (isConnected()) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp API - Conectado</title>
        <meta http-equiv="refresh" content="10">
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
          .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .success { color: #25D366; font-size: 48px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h1>WhatsApp Conectado</h1>
          <p>La sesión está activa. Puedes cerrar esta página.</p>
          <p style="font-size: 12px; color: #999;">Estado: ${state}</p>
        </div>
      </body>
      </html>
    `);
  }
  
  const qr = getCurrentQR();
  
  // Si está conectando pero aún no hay QR (reconexión con sesión existente)
  if (state === 'connecting' && !qr) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp API - Conectando</title>
        <meta http-equiv="refresh" content="2">
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
          .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .loader { border: 4px solid #f3f3f3; border-top: 4px solid #25D366; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="loader"></div>
          <h1>Conectando...</h1>
          <p>Restaurando sesión existente.</p>
          <p style="font-size: 12px; color: #999;">Esta página se actualizará automáticamente.</p>
        </div>
      </body>
      </html>
    `);
  }
  
  // Si no hay QR disponible aún (esperando generación)
  if (!qr) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp API - QR</title>
        <meta http-equiv="refresh" content="2">
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
          .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .loader { border: 4px solid #f3f3f3; border-top: 4px solid #25D366; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="loader"></div>
          <h1>Generando código QR...</h1>
          <p>Espera unos segundos.</p>
          <p style="font-size: 12px; color: #999;">Estado: ${state}</p>
        </div>
      </body>
      </html>
    `);
  }
  
  // Generar QR como imagen
  try {
    const qrImage = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp API - Escanear QR</title>
        <meta http-equiv="refresh" content="15">
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
          .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          img { border: 1px solid #ddd; border-radius: 10px; }
          h1 { color: #333; margin-bottom: 20px; }
          p { color: #666; }
          .warning { background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 15px; font-size: 13px; color: #856404; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 Escanea el código QR</h1>
          <img src="${qrImage}" alt="WhatsApp QR Code" />
          <p>Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
          <div class="warning">⚡ El QR expira en ~20 segundos. Si no funciona, espera uno nuevo.</div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error generando QR');
  }
});

/**
 * GET /status
 * Devuelve el estado de la conexión con WhatsApp
 */
router.get('/status', (req, res) => {
  const state = getConnectionState();
  const connected = isConnected();
  
  res.json({
    success: true,
    data: {
      connected,
      state,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * POST /send-message
 * Envía un mensaje de texto por WhatsApp
 * Body: { "to": "521XXXXXXXXXX", "message": "Hola mundo" }
 */
router.post('/send-message', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    // Validar campos requeridos
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'El campo "to" es requerido'
      });
    }
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'El campo "message" es requerido'
      });
    }
    
    // Verificar conexión antes de enviar
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp no está conectado. Escanea el QR primero.'
      });
    }
    
    // Enviar mensaje
    const result = await sendTextMessage(to, message);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('[API] Error en /send-message:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
