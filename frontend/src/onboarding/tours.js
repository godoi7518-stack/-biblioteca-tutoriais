/**
 * Textos e passos dos tours de onboarding: um tour curto por tela, e por
 * papel quando o conteúdo muda (admin cria/edita; membro só lê).
 *
 * Cada passo aponta para um elemento marcado com data-tour="..." na tela
 * (target). Passo sem target aparece centralizado. Se o elemento não
 * existir naquele momento (ex.: lista vazia), o passo é pulado — por isso
 * alguns passos têm uma versão alternativa (ws-list / ws-empty).
 *
 * As chaves (workspaces, tabs-admin...) precisam bater com ONBOARDING_TOURS
 * em backend/app/routers/auth.py, onde fica salvo quais o usuário já viu.
 */

import { APP_NAME } from "../config/brand";

const HELP_STEP = {
  target: "help",
  title: "Ajuda",
  text: "Para ver estas dicas de novo, clique aqui em qualquer tela.",
};

export const TOURS = {
  workspaces: [
    {
      target: null,
      title: `Bem-vindo à ${APP_NAME}!`,
      text: "Aqui sua equipe guarda os processos do dia a dia em passos simples, que qualquer pessoa consegue seguir. Vamos fazer um tour rápido?",
    },
    {
      target: "ws-list",
      title: "Seus workspaces",
      text: "Cada workspace é um grupo de trabalho, como 'Inventário' ou 'Linha 3'. Aqui aparecem todos de que você participa.",
    },
    {
      target: "ws-empty",
      title: "Seus workspaces",
      text: "Você ainda não participa de nenhum workspace. Crie o seu ou peça a um colega que te convide pelo seu e-mail.",
    },
    {
      target: "ws-new",
      title: "Novo workspace",
      text: "Crie um workspace para a sua equipe. Quem cria vira admin e pode convidar as outras pessoas.",
    },
    {
      target: "search",
      title: "Busca",
      text: "Procure tutoriais, categorias e workspaces por aqui, inclusive palavras de dentro dos passos. Não precisa digitar a palavra inteira.",
    },
    {
      target: "theme",
      title: "Modo claro ou escuro",
      text: "Prefere a tela escura? Troque aqui.",
    },
    HELP_STEP,
  ],

  "tabs-admin": [
    {
      target: "tab-row",
      title: "Categorias",
      text: "Os tutoriais ficam separados por categoria. Clique numa categoria para ver os tutoriais dela.",
    },
    {
      target: "tab-new",
      title: "Nova categoria",
      text: "Crie categorias para organizar os assuntos, como 'Reimpressões' ou 'Fechamento de caixa'.",
    },
    {
      target: "tut-new",
      title: "Novo tutorial",
      text: "Escreva em texto corrido ou passo a passo. Você pode marcar etapas críticas e anexar um print em cada passo. O que você digita fica salvo como rascunho.",
    },
    {
      target: "members-btn",
      title: "Membros",
      text: "Convide a sua equipe pelo e-mail que a pessoa usou no cadastro. Membros só leem; admins criam e editam.",
    },
  ],

  "tabs-member": [
    {
      target: "tab-row",
      title: "Categorias",
      text: "Os tutoriais ficam separados por categoria. Clique numa categoria para ver os tutoriais dela.",
    },
    {
      target: "tut-list",
      title: "Tutoriais",
      text: "Clique num tutorial para abrir o passo a passo.",
    },
  ],

  "tutorial-admin": [
    {
      target: "tut-steps",
      title: "Passos",
      text: "Clique em cada passo para abrir. Passos em vermelho são etapas críticas: atenção redobrada.",
    },
    {
      target: "tut-images",
      title: "Imagens",
      text: "Clique numa imagem para ampliar. Use as setas para passar para as próximas.",
    },
    {
      target: "tut-menu",
      title: "Editar ou apagar",
      text: "Para editar ou apagar este tutorial, use este menu.",
    },
  ],

  "tutorial-member": [
    {
      target: "tut-steps",
      title: "Passos",
      text: "Clique em cada passo para abrir. Passos em vermelho são etapas críticas: atenção redobrada.",
    },
    {
      target: "tut-images",
      title: "Imagens",
      text: "Clique numa imagem para ampliar. Use as setas para passar para as próximas.",
    },
  ],

  "members-admin": [
    {
      target: "members-role",
      title: "Papel de cada pessoa",
      text: "Troque o papel de alguém aqui. O workspace precisa ter sempre pelo menos um admin.",
    },
    {
      target: "members-leave",
      title: "Sair do workspace",
      text: "Se não precisar mais deste workspace, você pode sair dele por aqui.",
    },
  ],

  // Mini-tour do formulário de tutorial (aberto pelo próprio TutorialForm na
  // primeira vez que um admin cria ou edita um tutorial).
  "tutorial-form": [
    {
      target: "form-type",
      title: "Escolha o formato",
      text: "Passo a passo é o mais indicado para procedimentos: cada etapa vira um bloco que o leitor abre e segue na ordem.",
    },
    {
      target: "form-step",
      title: "Cada passo",
      text: "Escreva um título curto dizendo o que fazer e, embaixo, como fazer.",
    },
    {
      target: "form-critical",
      title: "Etapa crítica",
      text: "Marque as etapas que não podem dar errado. Elas aparecem em vermelho para quem lê.",
    },
    {
      target: "form-image",
      title: "Imagem do passo",
      text: "Anexe um print ou uma foto para mostrar exatamente onde clicar ou o que conferir.",
    },
    {
      target: "form-add-step",
      title: "Mais passos",
      text: "Adicione quantos passos precisar. Depois dá para mudar a ordem, como mostram os próximos balões.",
    },
    {
      target: "form-drag",
      title: "Mudar a ordem arrastando",
      text: "Segure a alça ⠿ ao lado do número do passo e arraste para cima ou para baixo. Uma linha azul mostra onde o passo vai entrar.",
    },
    {
      target: "form-move",
      title: "Ou use as setas",
      text: "As setas ↑ ↓ sobem ou descem o passo uma posição. Funcionam também no celular, onde arrastar não está disponível.",
    },
  ],

  "members-member": [
    {
      target: "members-leave",
      title: "Sair do workspace",
      text: "Se não precisar mais deste workspace, você pode sair dele por aqui.",
    },
  ],
};

/**
 * Qual tour vale para a tela aberta. role é o papel no workspace aberto
 * (my_role). Retorna null quando a tela não tem tour (ex.: busca).
 */
export function tourKeyFor(page, role) {
  if (page === "workspaces") return "workspaces";
  const suffix = role === "admin" ? "admin" : "member";
  if (page === "tabs") return `tabs-${suffix}`;
  if (page === "tutorial") return `tutorial-${suffix}`;
  if (page === "members") return `members-${suffix}`;
  return null;
}
