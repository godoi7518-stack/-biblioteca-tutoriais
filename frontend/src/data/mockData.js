// Dados mockados para o protótipo do front-end.
// Quando os endpoints reais (workspaces, tabs, tutorials) estiverem prontos no backend,
// substitua estes arrays por chamadas em src/services/api.js (fetch/axios).

export const USERS = [
  { id: 1, username: "admin", password: "admin123", name: "Gabriel Godoi", role: "admin" },
  { id: 2, username: "parceiro", password: "parceiro123", name: "Renata Alves", role: "member" },
];

export const WORKSPACES = [
  { id: 1, name: "Fábrica Extrema", desc: "Processos da unidade de Extrema/MG", tabCount: 3 },
  { id: 2, name: "Loja Parceira SP", desc: "Procedimentos para parceiros comerciais", tabCount: 2 },
];

export const TABS = [
  { id: 1, workspaceId: 1, name: "Estoque" },
  { id: 2, workspaceId: 1, name: "Produção" },
  { id: 3, workspaceId: 1, name: "Fechamento de Caixa" },
  { id: 4, workspaceId: 2, name: "Atendimento" },
  { id: 5, workspaceId: 2, name: "Devoluções" },
];

export const TUTORIALS = [
  {
    id: 1,
    tabId: 1,
    type: "structured",
    title: "Reimpressão de etiqueta de Handling Unit",
    summary: "Como reimprimir a etiqueta de uma HU sem duplicar o registro no SAP",
    steps: [
      { title: "Acesse a transação de HU", text: "No SAP, abra a transação correspondente e localize o número da Handling Unit pelo material ou pelo número de série.", critical: false },
      { title: "Confirme o status da HU", text: "Verifique se a HU já foi contabilizada. Reimprimir uma HU já baixada gera divergência de estoque.", critical: true },
      { title: "Selecione a opção de reimpressão", text: "Use a opção de reimpressão de etiqueta — nunca crie uma nova HU para gerar uma segunda etiqueta.", critical: true },
      { title: "Envie para a impressora correta", text: "Confira o nome da impressora do setor antes de confirmar a impressão.", critical: false },
    ],
  },
  {
    id: 2,
    tabId: 1,
    type: "simple",
    title: "Reconciliação de estoque — visão geral",
    summary: "Quando e por que rodar a reconciliação semanal",
    body:
      "A reconciliação de estoque compara o saldo físico contado no setor com o saldo apontado no SAP.\n\n" +
      "**Frequência:** toda sexta-feira, antes do fechamento do turno.\n\n" +
      "Divergências acima de 2% devem ser reportadas ao supervisor do turno antes de qualquer ajuste manual no sistema.",
  },
  {
    id: 3,
    tabId: 2,
    type: "structured",
    title: "Abertura de ordem de produção",
    summary: "Passo a passo para abrir uma nova ordem no módulo de produção",
    steps: [
      { title: "Verifique a disponibilidade de material", text: "Confirme que os componentes da lista técnica têm saldo suficiente antes de abrir a ordem.", critical: false },
      { title: "Crie a ordem no sistema", text: "Preencha centro, material e quantidade planejada.", critical: false },
      { title: "Libere a ordem", text: "A liberação é irreversível para o turno atual — confirme os dados antes de liberar.", critical: true },
    ],
  },
  {
    id: 4,
    tabId: 3,
    type: "simple",
    title: "Checklist de fechamento de caixa",
    summary: "Itens obrigatórios antes de encerrar o turno",
    body:
      "Antes de encerrar o caixa, confira:\n\n" +
      "- Conferência do fundo de troco\n- Bater o relatório do sistema com o dinheiro físico\n- Registrar qualquer diferença no livro de ocorrências\n\n" +
      "Diferenças não registradas no mesmo turno dificultam a apuração posterior.",
  },
  {
    id: 5,
    tabId: 4,
    type: "simple",
    title: "Como registrar um chamado de atendimento",
    summary: "Fluxo básico para abrir um chamado para um parceiro",
    body:
      "Todo chamado deve conter: nome do parceiro, código da loja e descrição objetiva do problema.\n\n" +
      "Chamados sem código da loja são devolvidos automaticamente para complementação.",
  },
  {
    id: 6,
    tabId: 5,
    type: "structured",
    title: "Processo de devolução de mercadoria",
    summary: "Etapas para registrar e aprovar uma devolução",
    steps: [
      { title: "Confira a nota fiscal", text: "A devolução só pode ser iniciada com a nota fiscal de origem em mãos.", critical: false },
      { title: "Inspecione o produto", text: "Produtos com lacre violado seguem para análise separada — não aprove a devolução direto.", critical: true },
      { title: "Registre no sistema", text: "Lance a devolução vinculando o número da nota original.", critical: false },
    ],
  },
];
