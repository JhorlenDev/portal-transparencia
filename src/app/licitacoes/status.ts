/** Nomes e cores dos status de licitacao (API da Prefeitura e Fiorilli). */
export const STATUS_LICITACAO: Record<string, { label: string; cor: string }> = {
  planejamento: { label: "Planejamento", cor: "border border-slate-200 bg-slate-100 text-slate-700" },
  publicado: { label: "Publicado", cor: "border border-blue-100 bg-blue-50 text-blue-700" },
  em_andamento: { label: "Em andamento", cor: "border border-amber-100 bg-amber-50 text-amber-700" },
  classificado: { label: "Classificado", cor: "border border-indigo-100 bg-indigo-50 text-indigo-700" },
  homologado: { label: "Homologado", cor: "border border-green-100 bg-green-50 text-green-700" },
  encerrado: { label: "Encerrado", cor: "border border-slate-200 bg-slate-200 text-institutional" },
  revoked: { label: "Revogado", cor: "border border-red-100 bg-red-50 text-red-700" },
  nao_informado: { label: "Não informado", cor: "border border-slate-200 bg-slate-50 text-slate-500" },
}

export function statusLicitacao(status: string) {
  return STATUS_LICITACAO[status] ?? { label: status, cor: "border border-slate-200 bg-slate-100 text-slate-700" }
}

/** Identidade discreta por modalidade, sem depender da grafia exata recebida da integração. */
export function corModalidadeLicitacao(modalidade?: string | null) {
  const valor = (modalidade || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  if (valor.includes("dispensa")) return "border-red-100 bg-red-50 text-red-700"
  if (valor.includes("inexig")) return "border-amber-100 bg-amber-50 text-amber-700"
  if (valor.includes("pregao")) return "border-blue-100 bg-blue-50 text-blue-700"
  if (valor.includes("concorr")) return "border-indigo-100 bg-indigo-50 text-indigo-700"
  if (valor.includes("tomada")) return "border-teal-100 bg-teal-50 text-teal-700"
  if (valor.includes("convite")) return "border-slate-200 bg-slate-100 text-slate-700"
  return "border-slate-200 bg-slate-50 text-slate-600"
}
