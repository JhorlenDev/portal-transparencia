/** Formatadores compartilhados entre a interface e os scripts de teste. */

export function formatarBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`

  const unidades = ['KB', 'MB', 'GB', 'TB']
  let valor = bytes / 1024
  let i = 0
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024
    i += 1
  }
  return `${valor.toFixed(valor >= 100 ? 0 : 1).replace('.', ',')} ${unidades[i]}`
}

export function formatarDuracao(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${ms} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1).replace('.', ',')} s`

  const minutos = Math.floor(ms / 60_000)
  const segundos = Math.round((ms % 60_000) / 1000)
  return `${minutos} min ${segundos}s`
}

export function formatarDataHora(iso: string | null | undefined, fuso = 'America/Manaus'): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: fuso,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const DIAS_SEMANA = [
  { valor: 0, nome: 'Dom' },
  { valor: 1, nome: 'Seg' },
  { valor: 2, nome: 'Ter' },
  { valor: 3, nome: 'Qua' },
  { valor: 4, nome: 'Qui' },
  { valor: 5, nome: 'Sex' },
  { valor: 6, nome: 'Sáb' },
]
