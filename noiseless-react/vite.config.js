import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const page = (p) => fileURLToPath(new URL(p, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // two pages: the site, and /how-it-works/ (the model and the math)
      input: { main: page('./index.html'), how: page('./how-it-works/index.html') },
    },
  },
})
