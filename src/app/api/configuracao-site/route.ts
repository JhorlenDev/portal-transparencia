import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { getSiteConfig, saveConfig, getAllConfigs } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const configs = await getAllConfigs()

    if (configs.length === 0) {
      const { getSiteConfig } = await import('@/lib/site-data')
      const defaultConfig = await getSiteConfig()
      return NextResponse.json(defaultConfig)
    }

    const configObj: Record<string, string> = {}
    configs.forEach((c: { chave: string; valor: string }) => {
      configObj[c.chave] = c.valor
    })

    return NextResponse.json(configObj)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError

  try {
    const data = await request.json()

    if (typeof data === 'object' && !Array.isArray(data)) {
      const entries = Object.entries(data)
      
      for (const [chave, valor] of entries) {
        if (valor !== undefined && valor !== null) {
          await saveConfig(chave, String(valor))
        }
      }

      return NextResponse.json({ message: 'Configurações salvas com sucesso' })
    }

    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  return POST(request)
}
