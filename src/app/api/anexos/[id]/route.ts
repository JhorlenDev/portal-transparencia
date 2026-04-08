import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

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

    const publicDir = path.join(process.cwd(), 'public')
    let filePath = path.join(publicDir, anexo.urlArquivo.replace(/^\//, ''))

    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath)
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir)
        const match = files.find(f => f.endsWith(anexo.nomeArquivo))
        if (match) {
          filePath = path.join(dir, match)
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Arquivo nao encontrado no disco', { status: 404 })
    }

    const buffer = fs.readFileSync(filePath)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': anexo.tipoMime || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${anexo.nomeArquivo}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving attachment:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}
