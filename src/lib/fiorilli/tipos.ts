/** Resultado da carga de um modulo para um exercicio. */
export interface ResultadoModulo {
  recebidos: number
  inseridos: number
  atualizados: number
  removidos: number
  /** Registros descartados (sem chave ou repetidos). */
  erros: number
  /** Diferencas encontradas na conferencia com os totais oficiais. */
  divergencias: string[]
  /** Quando preenchido, a carga foi ignorada de proposito (nada foi gravado). */
  ignorado?: string
  aviso?: string
}
