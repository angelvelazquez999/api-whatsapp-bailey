// Configuración de PM2 para producción
module.exports = {
  apps: [{
    name: 'whatsapp-api',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Logs
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    merge_logs: true,
    // Reintentos
    exp_backoff_restart_delay: 100
  }]
};
