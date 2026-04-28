import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function getPublicBaseUrl(requestUrl: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.SITE_URL

  if (!configuredUrl) {
    return requestUrl
  }

  return configuredUrl.startsWith('http://') || configuredUrl.startsWith('https://')
    ? configuredUrl
    : `https://${configuredUrl}`
}

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

    return NextResponse.redirect(new URL(anexo.urlArquivo, getPublicBaseUrl(request.url)))
  } catch (error) {
    console.error('Error serving attachment:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}
