/**
 * Ponto de entrada do frontend: carrega os estilos globais e monta o App
 * dentro do DialogProvider (janelas de confirmação/texto/aviso do site,
 * disponíveis para qualquer tela via useDialog()).
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { DialogProvider } from "./components/DialogProvider";
import "./styles/app.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </StrictMode>
);
