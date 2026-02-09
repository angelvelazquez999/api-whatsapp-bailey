# Baileys WhatsApp API

API REST para enviar mensajes de WhatsApp usando la librería Baileys.

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
# Clonar o descargar el proyecto
cd baileys-msg-api

# Instalar dependencias
npm install
```

## Uso

### Iniciar el servidor

```bash
# Producción
npm start

# Desarrollo (con hot reload)
npm run dev
```

Al iniciar por primera vez, se mostrará un código QR en la consola. Escanéalo con WhatsApp desde tu teléfono (Dispositivos vinculados).

### Endpoints

#### Health Check
```bash
curl http://localhost:3000/health
```

#### Estado de conexión
```bash
curl http://localhost:3000/status
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "state": "connected",
    "timestamp": "2026-01-13T12:00:00.000Z"
  }
}
```

#### Enviar mensaje
```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "521XXXXXXXXXX",
    "message": "Hola desde la API!"
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0...",
    "to": "521XXXXXXXXXX",
    "timestamp": "2026-01-13T12:00:00.000Z"
  }
}
```

#### Enviar imagen
```bash
# Con URL
curl -X POST http://localhost:3000/send-image \
  -H "Content-Type: application/json" \
  -d '{
    "to": "521XXXXXXXXXX",
    "image": "https://ejemplo.com/imagen.jpg",
    "caption": "Texto opcional para la imagen"
  }'

# Con base64
curl -X POST http://localhost:3000/send-image \
  -H "Content-Type: application/json" \
  -d '{
    "to": "521XXXXXXXXXX",
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "caption": "Imagen en base64"
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0...",
    "to": "521XXXXXXXXXX",
    "timestamp": "2026-01-13T12:00:00.000Z"
  }
}
```

## Docker

### Construir imagen
```bash
docker build -t baileys-api .
```

### Ejecutar contenedor
```bash
docker run -d \
  --name whatsapp-api \
  -p 3000:3000 \
  -v $(pwd)/sessions:/app/sessions \
  baileys-api
```

> **Nota:** El volumen `sessions` es importante para persistir la sesión de WhatsApp.

### Ver logs (para escanear QR)
```bash
docker logs -f whatsapp-api
```

## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| PORT | Puerto del servidor | 3000 |
| SESSION_NAME | Nombre de la sesión | whatsapp-session |
| LOG_LEVEL | Nivel de logs de Baileys | silent |

## Estructura del proyecto

```
baileys-msg-api/
├── src/
│   ├── config/
│   │   └── index.js      # Configuración
│   ├── routes/
│   │   └── whatsapp.js   # Rutas de la API
│   ├── services/
│   │   └── whatsapp.js   # Lógica de Baileys
│   └── index.js          # Entrada principal
├── sessions/             # Sesiones (no subir a git)
├── package.json
├── Dockerfile
└── README.md
```

## Notas importantes

1. **Sesiones**: La carpeta `sessions/` contiene las credenciales de WhatsApp. No la subas a repositorios públicos.

2. **Formato de número**: Usa el formato internacional sin el signo `+`:
   - México: `521XXXXXXXXXX` (52 = país, 1 = móvil)
   - España: `34XXXXXXXXX`
   - Argentina: `549XXXXXXXXXX`

3. **Reconexión**: La API reconecta automáticamente si se pierde la conexión (excepto si cierras sesión desde el teléfono).

4. **Límites**: WhatsApp puede bloquear números que envíen muchos mensajes. Úsalo responsablemente.

## Ejemplos con Postman

### Enviar mensaje de texto

- **Method**: POST
- **URL**: `http://localhost:3000/send-message`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "to": "521XXXXXXXXXX",
  "message": "Mensaje de prueba desde Postman"
}
```

### Enviar imagen

- **Method**: POST
- **URL**: `http://localhost:3000/send-image`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "to": "521XXXXXXXXXX",
  "image": "https://picsum.photos/800/600",
  "caption": "Imagen de prueba con caption"
}
```

## Troubleshooting

**El QR no aparece:**
- Elimina la carpeta `sessions/` y reinicia

**"WhatsApp no está conectado":**
- Verifica que escaneaste el QR correctamente
- Revisa el estado con `GET /status`

**Sesión cerrada desde el teléfono:**
- Elimina `sessions/` y escanea el QR nuevamente
