// Configuração do Vite (servidor de desenvolvimento e build do frontend).
// O plugin do React habilita JSX e o recarregamento instantâneo ao salvar.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Porta fixa: o backend libera CORS só para http://localhost:5173.
    port: 5173,
    strictPort: true,
  },
});
