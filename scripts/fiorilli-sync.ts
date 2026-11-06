#!/usr/bin/env npx tsx
/**
 * Sincronizacao com a Fiorilli pela linha de comando (carga historica ou reprocessamento).
 * Grava no banco de DATABASE_URL, igual a sincronizacao agendada.
 *
 * Uso:  npx tsx scripts/fiorilli-sync.ts                                  (exercicio corrente)
 *       npx tsx scripts/fiorilli-sync.ts --anos 2022,2023,2024,2025
 *       npx tsx scripts/fiorilli-sync.ts --anos 2025 --modulos despesas
 */

import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { MODULOS_FIORILLI, sincronizarFiorilli, type ModuloFiorilli } from '../src/lib/fiorilli/sync'

function argumento(nome: string): string | undefined {
  const indice = process.argv.indexOf(nome)
  return indice >= 0 ? process.argv[indice + 1] : undefined
}

function lista(valor: string | undefined): string[] {
  return (valor || '').split(',').map((v) => v.trim()).filter(Boolean)
}

async function main() {
  const exercicios = lista(argumento('--anos')).map(Number)
  const modulos = lista(argumento('--modulos')) as ModuloFiorilli[]

  const invalidos = [
    ...exercicios.filter((a) => !Number.isInteger(a) || a < 2000 || a > 2999).map(String),
    ...modulos.filter((m) => !MODULOS_FIORILLI.includes(m)),
  ]
  if (invalidos.length > 0) {
    console.error(`Valores invalidos: ${invalidos.join(', ')}. Modulos: ${MODULOS_FIORILLI.join(', ')}.`)
    return 1
  }

  const resultados = await sincronizarFiorilli({ exercicios, modulos, origem: 'CLI' })

  for (const r of resultados) {
    const numeros = r.status === 'ERRO'
      ? r.erro
      : `recebidos ${r.recebidos}, inseridos ${r.inseridos}, atualizados ${r.atualizados}, removidos ${r.removidos}, descartados ${r.erros}`
    console.log(`${r.modulo} ${r.exercicio}: ${r.status} (${(r.duracaoMs / 1000).toFixed(1)}s) — ${numeros}`)
    for (const linha of [r.ignorado, r.aviso, ...(r.divergencias ?? [])].filter(Boolean)) {
      console.log(`    ${linha}`)
    }
  }

  return resultados.some((r) => r.status === 'ERRO' || r.status === 'DIVERGENTE') ? 1 : 0
}

main()
  .then(async (codigo) => {
    await prisma.$disconnect()
    process.exit(codigo)
  })
  .catch(async (erro) => {
    console.error(erro)
    await prisma.$disconnect()
    process.exit(1)
  })
