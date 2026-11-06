/** Nomes e cores dos status de licitacao (API da Prefeitura e Fiorilli). */
export const STATUS_LICITACAO: Record<string, { label: string; cor: string }> = {
  planejamento: { label: "Planejamento", cor: "bg-slate-100 text-slate-700" },
  publicado: { label: "Publicado", cor: "bg-blue-100 text-blue-700" },
  em_andamento: { label: "Em andamento", cor: "bg-amber-100 text-amber-700" },
  classificado: { label: "Classificado", cor: "bg-sky-100 text-sky-700" },
  homologado: { label: "Homologado", cor: "bg-green-100 text-green-700" },
  encerrado: { label: "Encerrado", cor: "bg-slate-200 text-slate-700" },
  revoked: { label: "Revogado", cor: "bg-red-100 text-red-700" },
  nao_informado: { label: "Não informado", cor: "bg-slate-100 text-slate-500" },
}

export function statusLicitacao(status: string) {
  return STATUS_LICITACAO[status] ?? { label: status, cor: "bg-slate-100 text-slate-700" }
}
