/** Mini-framework de testes usado pelos scripts de verificacao do backup. */

export interface Resultado {
  nome: string
  ok: boolean
  detalhe: string
  ms: number
}

export const resultados: Resultado[] = []
let grupoAtual = ''

export function grupo(titulo: string): void {
  grupoAtual = titulo
  console.log(`\n\x1b[1m${titulo}\x1b[0m`)
}

export async function teste(nome: string, fn: () => Promise<string | void>): Promise<void> {
  const inicio = Date.now()
  try {
    const detalhe = (await fn()) || ''
    const ms = Date.now() - inicio
    resultados.push({ nome: `${grupoAtual} / ${nome}`, ok: true, detalhe, ms })
    console.log(`  \x1b[32m✓\x1b[0m ${nome}${detalhe ? ` \x1b[2m— ${detalhe}\x1b[0m` : ''} \x1b[2m(${ms}ms)\x1b[0m`)
  } catch (erro) {
    const ms = Date.now() - inicio
    const mensagem = erro instanceof Error ? erro.message : String(erro)
    resultados.push({ nome: `${grupoAtual} / ${nome}`, ok: false, detalhe: mensagem, ms })
    console.log(`  \x1b[31m✗\x1b[0m ${nome}\n      \x1b[31m${mensagem}\x1b[0m`)
  }
}

export function verificar(condicao: unknown, mensagem: string): asserts condicao {
  if (!condicao) throw new Error(mensagem)
}

export function igual<T>(obtido: T, esperado: T, contexto: string): void {
  if (obtido !== esperado) {
    throw new Error(`${contexto}: esperado ${JSON.stringify(esperado)}, obtido ${JSON.stringify(obtido)}`)
  }
}

/** Imprime o resumo e devolve o codigo de saida (0 = tudo passou). */
export function resumo(): number {
  const falhas = resultados.filter((r) => !r.ok)
  const total = resultados.length

  console.log(`\n${'─'.repeat(60)}`)
  console.log(
    falhas.length === 0
      ? `\x1b[32m${total} testes, todos passaram.\x1b[0m`
      : `\x1b[31m${falhas.length} de ${total} testes falharam:\x1b[0m`
  )
  for (const falha of falhas) console.log(`  - ${falha.nome}: ${falha.detalhe}`)

  return falhas.length === 0 ? 0 : 1
}
