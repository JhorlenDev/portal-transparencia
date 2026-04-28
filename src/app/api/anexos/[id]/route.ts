import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const anexo = await prisma.anexo.findUnique({ where: { id } })

    if (!anexo) {
      return new NextResponse('Anexo nao encontrado', { status: 404 })
    }

    return NextResponse.redirect(new URL(anexo.urlArquivo, request.url))
  } catch (error) {
    console.error('Error serving attachment:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}
