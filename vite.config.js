import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server middleware plugin for /api/admin/* endpoints
function devApiPlugin() {
  return {
    name: 'dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/admin/')) {
          return next();
        }

        // Add standard Express/Vercel helpers to Connect res
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return res;
        };

        const parsedUrl = new URL(req.url, 'http://localhost');
        const pathname = parsedUrl.pathname;

        try {
          if (pathname === '/api/admin/login') {
            const { default: loginHandler } = await import('./api/admin/login.js');
            return await loginHandler(req, res);
          } else if (pathname === '/api/admin/session') {
            const { default: sessionHandler } = await import('./api/admin/session.js');
            return await sessionHandler(req, res);
          } else if (pathname === '/api/admin/logout') {
            const { default: logoutHandler } = await import('./api/admin/logout.js');
            return await logoutHandler(req, res);
          }
        } catch (err) {
          console.error('Dev API middleware error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devApiPlugin()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react']
        }
      }
    }
  }
})
