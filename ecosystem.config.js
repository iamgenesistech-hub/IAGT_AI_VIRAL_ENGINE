// PM2 Ecosystem Config — EVICS / IAGT AI Viral Engine
// Usage:
//   pm2 start ecosystem.config.js          (start)
//   pm2 restart evics-backend              (restart)
//   pm2 logs evics-backend                 (tail logs)
//   pm2 save && pm2 startup                (auto-start on boot)

module.exports = {
  apps: [
    {
      name: 'evics-backend',
      script: 'backend/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4175
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 4175
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/evics-error.log',
      out_file: 'logs/evics-out.log',
      merge_logs: true,
      // Restart delay on crash — prevents rapid restart loops
      restart_delay: 3000,
      // Exponential backoff on repeated crashes
      exp_backoff_restart_delay: 100,
      // Kill timeout for graceful shutdown
      kill_timeout: 5000,
    }
  ]
};
