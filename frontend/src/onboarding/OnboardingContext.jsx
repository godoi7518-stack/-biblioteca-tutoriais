/**
 * Dá a qualquer componente acesso ao "já viu este tour?" e ao "marcar como
 * visto", sem passar props por todas as telas. O App fornece os valores
 * (a partir de user.onboarding_seen); o formulário de tutorial usa para o
 * seu próprio mini-tour.
 */

import { createContext, useContext } from "react";

export const OnboardingContext = createContext(null);

/** { hasSeen(chave), markSeen(chave) } — ou null fora do App logado. */
export function useOnboarding() {
  return useContext(OnboardingContext);
}
