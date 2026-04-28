import { NextResponse } from 'next/server'
import { getGlobalSearch } from '@/lib/site-data'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  
  if (!query || query.length < 2) {
    return NextResponse.json({ despesas: [], receitas: [], licitacoes: [], contratos: [], servidores: [] })
  }

  try {
    const results = await getGlobalSearch(query)
    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
