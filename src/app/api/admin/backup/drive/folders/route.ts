import { NextResponse, type NextRequest } from 'next/server'
import { exigirAdmin, respostaDeErro } from '@/lib/admin-guard'
import { criarPasta, infoArquivo, listarPastas } from '@/lib/backup/drive'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    const parent = request.nextUrl.searchParams.get('parent') || 'root'
    const [pastas, info] = await Promise.all([
      listarPastas(parent),
      parent === 'root' ? Promise.resolve(null) : infoArquivo(parent),
    ])

    return NextResponse.json({
      parent,
      nome: parent === 'root' ? 'Meu Drive' : info?.nome ?? 'Pasta',
      pai: info?.parents?.[0] ?? (parent === 'root' ? null : 'root'),
      pastas,
    })
  } catch (erro) {
    return respostaDeErro(erro)
  }
}

export async function POST(request: NextRequest) {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    const corpo = (await request.json()) as { nome?: string; parent?: string }
    const nome = (corpo.nome ?? '').trim()

    if (!nome) return NextResponse.json({ error: 'Informe o nome da pasta.' }, { status: 400 })
    if (nome.length > 120) {
      return NextResponse.json({ error: 'Nome de pasta muito longo.' }, { status: 400 })
    }

    return NextResponse.json(await criarPasta(nome, corpo.parent || 'root'))
  } catch (erro) {
    return respostaDeErro(erro)
  }
}
