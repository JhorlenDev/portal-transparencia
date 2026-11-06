import { NextRequest, NextResponse } from 'next/server'
import { CONJUNTOS, type ParametrosExportacao } from '@/lib/exportacao/conjuntos'
import { gerarCsv, gerarXlsx } from '@/lib/exportacao/formatos'

export const dynamic = 'force-dynamic'

const TIPOS_CONTEUDO = {
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const

type Formato = keyof typeof TIPOS_CONTEUDO

/** O JSON mantem os campos do banco (como antes), sem o registro cru da API de origem. */
function semPayload(linhas: unknown[]): unknown[] {
  return linhas.map((linha) => {
    const copia = { ...(linha as Record<string, unknown>) }
    delete copia.payload
    return copia
  })
}

/**
 * Exportacao em formato aberto (LAI) de cada conjunto de dados, com os mesmos filtros das paginas:
 *   /api/export?type=despesas&ano=2025&format=xlsx&orgao=...
 * Formatos: csv (padrao), json e xlsx.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const conjunto = CONJUNTOS[searchParams.get('type') || '']
  const formato = (searchParams.get('format') || 'csv') as Formato

  if (!conjunto) {
    return NextResponse.json({ error: `Tipo inválido. Tipos: ${Object.keys(CONJUNTOS).join(', ')}` }, { status: 400 })
  }
  if (!(formato in TIPOS_CONTEUDO)) {
    return NextResponse.json({ error: 'Formato inválido. Formatos: csv, json, xlsx' }, { status: 400 })
  }

  const texto = (nome: string) => searchParams.get(nome) || undefined
  const ano = Number.parseInt(searchParams.get('ano') || '', 10)
  const mes = Number.parseInt(searchParams.get('mes') || '', 10)
  const parametros: ParametrosExportacao = {
    ano: Number.isInteger(ano) ? ano : new Date().getFullYear(),
    q: texto('q'),
    status: texto('status'),
    categoria: texto('categoria'),
    orgao: texto('orgao'),
    credor: texto('credor'),
    fornecedor: texto('fornecedor'),
    modalidade: texto('modalidade'),
    tipo: texto('tipo'),
    mes: Number.isInteger(mes) ? mes : undefined,
    favorecido: texto('favorecido'),
    entidade: texto('entidade'),
  }

  try {
    const linhas = await conjunto.buscar(parametros)
    const corpo = formato === 'xlsx'
      ? new Uint8Array(gerarXlsx(linhas, conjunto.colunas))
      : formato === 'json'
        ? JSON.stringify(semPayload(linhas))
        : gerarCsv(linhas, conjunto.colunas)

    return new NextResponse(corpo, {
      headers: {
        'Content-Type': TIPOS_CONTEUDO[formato],
        'Content-Disposition': `attachment; filename="${conjunto.arquivo}-${parametros.ano}.${formato}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Erro ao exportar dados' }, { status: 500 })
  }
}
