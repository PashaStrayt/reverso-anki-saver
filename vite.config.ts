import { defineConfig, Plugin } from 'vite';
import monkey from 'vite-plugin-monkey';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin to inject fresh build time on every rebuild
function buildTimePlugin(): Plugin {
  const virtualModuleId = 'virtual:build-time';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  return {
    name: 'build-time-plugin',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export const BUILD_TIME = "${new Date().toISOString()}";`;
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_MODE__: JSON.stringify(mode),
  },
  server: {
    watch: {
      // Fix for macOS where file watching doesn't work properly
      usePolling: true,
      interval: 1000,
    },
    cors: true,
    port: 7744,
  },
  publicDir: false, // Don't serve from public/
  plugins: [
    // Serve built files from dist/ during development
    {
      name: 'serve-dist',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.user.js')) {
            const filePath = path.join(__dirname, 'dist', path.basename(req.url));
            
            if (fs.existsSync(filePath)) {
              res.setHeader('Content-Type', 'text/javascript');
              res.setHeader('Cache-Control', 'no-cache');
              res.end(fs.readFileSync(filePath, 'utf-8'));
              return;
            }
          }
          next();
        });
      },
    },
    buildTimePlugin(),
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: mode === 'development' ? 'Reverso to Anki (DEV)' : 'Reverso to Anki',
        namespace: 'reverso-anki-saver',
        version: '0.1.0',
        description: 'Add Reverso dictionary cards to Anki with one click',
        author: 'You',
        match: ['https://dictionary.reverso.net/english-definition/*'],
        icon: 'https://dictionary.reverso.net/favicon.ico',
        grant: [
          'GM_xmlhttpRequest',
          'GM_addStyle',
          'GM_getValue',
          'GM_setValue'
        ],
        connect: ['127.0.0.1', 'localhost'],
      },
      server: {
        open: false,
      },
      build: {
        fileName: mode === 'development' 
          ? 'dev.reverso-anki-saver.user.js'
          : 'reverso-anki-saver.user.js',
      },
    }),
  ],
}));
