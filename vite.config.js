import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/', // Base public path for production builds

  // Disable publicDir to prevent copying the entire project root into dist/.
  // Static assets like manifest.json should be handled by rollup or explicitly copied if needed.
  publicDir: false, 

  plugins: [
    // No specific plugins needed for basic JS/CSS bundling with Vite
  ],

  build: {
    // `dist` is the default output directory.
    outDir: 'dist', 
    // `assetsDir` specifies the subdirectory within `outDir` for processed assets (e.g., dist/assets/).
    assetsDir: 'assets', 

    rollupOptions: {
      input: {
        // Specify index.html as the main entry point.
        main: resolve(__dirname, 'index.html'),
      },
      // Vite automatically handles rewriting asset paths when processing the input HTML.
    },
    minify: 'esbuild', // Use esbuild for minification
  },

  server: {
    open: true, // Automatically open the browser when the dev server starts
    // Vite will serve from the project root by default, which contains index.html
  },

  resolve: {
    alias: {
      // Alias for 'js' directory if needed for imports like 'import ... from '@/app.js''
      // '@': resolve(__dirname, 'js'), 
    },
  },
});