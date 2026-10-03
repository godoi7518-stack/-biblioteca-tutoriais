/**
 * Tema claro/escuro.
 *
 * A escolha do usuário fica salva no localStorage ("bt_theme") e é aplicada
 * como atributo data-theme no <html>; o app.css troca as cores a partir
 * dele. Sem escolha salva, o site segue o tema do sistema operacional.
 *
 * O index.html tem um script que repete a parte de "aplicar o tema salvo"
 * ANTES do React carregar — senão a página abriria com o tema errado e
 * trocaria um instante depois (efeito de "piscar").
 */

import { useState } from "react";

const STORAGE_KEY = "bt_theme";

/** Tema que está valendo agora: o escolhido, ou o do sistema. */
export function getCurrentTheme() {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    /* navegador sem localStorage (ex.: modo restrito): só não lembra */
  }
}

/** Hook usado pelo botão do header: devolve o tema atual e a função de alternar. */
export function useTheme() {
  const [theme, setTheme] = useState(getCurrentTheme);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return { theme, toggleTheme };
}
