import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        client: resolve(__dirname, 'src/client.ts'),
        worker: resolve(__dirname, 'src/worker.ts'),
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        '@modelcontextprotocol/sdk',
        '@sitnikov/tab-sync',
        'websocket-mcp',
      ],
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});