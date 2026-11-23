const { execSync } = require('child_process');
const app = require('./app');
const connectDB = require('./config/db');
const { PORT, NODE_ENV } = require('./config/env');

// Helper to automatically free the port if another stale process is holding it
const freePort = (targetPort) => {
  if (process.env.NODE_ENV === 'production') return;
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const stdout = execSync(`netstat -ano | findstr :${targetPort}`, { encoding: 'utf8' });
      const lines = stdout.trim().split('\n');
      const killed = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== String(process.pid) && !killed.has(pid)) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            killed.add(pid);
            console.log(`🧹 Auto-freed port ${targetPort} (Terminated stale PID ${pid})`);
          } catch (_) {}
        }
      }
    } else {
      execSync(`lsof -ti :${targetPort} | xargs kill -9`, { stdio: 'ignore' });
    }
  } catch (_) {
    // Port is already free
  }
};

const startServer = async () => {
  // 1. Auto-clear port before binding
  freePort(PORT);

  // 2. Connect to database
  await connectDB();

  // 3. Start listening with automatic retry on EADDRINUSE
  const server = app.listen(PORT, () => {
    console.log(`🚀 Amba Lifestyle Backend Server running in [${NODE_ENV}] mode on port ${PORT}`);
    console.log(`📡 Base URL: http://localhost:${PORT}`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/api/v1/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${PORT} was busy. Clearing stale process and retrying in 1s...`);
      freePort(PORT);
      setTimeout(() => {
        server.close();
        server.listen(PORT);
      }, 1000);
    } else {
      console.error(`💥 Server error: ${err.message}`);
    }
  });

  // Graceful shutdown on nodemon restart (SIGUSR2) & process termination
  const gracefulExit = () => {
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1000);
  };

  process.once('SIGUSR2', () => {
    server.close(() => {
      process.kill(process.pid, 'SIGUSR2');
    });
  });

  process.on('SIGINT', gracefulExit);
  process.on('SIGTERM', gracefulExit);

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`💥 Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ EADDRINUSE on port ${PORT}. Auto-clearing and restarting...`);
      freePort(PORT);
      return;
    }
    console.error(`💥 Uncaught Exception: ${err.message}`);
    process.exit(1);
  });
};

startServer();
