import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    port: 3002,
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({ srcDirectory: 'app' }),
    nitro(),
    viteReact(),
  ],
})

export default config
