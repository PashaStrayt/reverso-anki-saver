import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig(() => ({
  plugins: [
    monkey({
      entry: 'src/loader.ts',
      userscript: {
        name: 'Reverso to Anki (DEV LOADER)',
        namespace: 'reverso-anki-saver-loader',
        version: '1.0.0',
        description: 'Hot-reload development loader',
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
      build: {
        fileName: 'loader-dev.user.js',
      },
    }),
  ],
}));
