import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function arrayToCSV<T extends object>(data: T[], columns: string[], headers: string[]): string {
  const headerRow = headers.join(',')
  const rows = data.map(item => 
    columns.map(col => {
      const value = (item as Record<string, unknown>)[col]
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )
  return [headerRow, ...rows].join('\n')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const format = searchParams.get('format') || 'csv'
  const ano = searchParams.get('ano')
  const search = searchParams.get('q')
  const status = searchParams.get('status')
  const categoria = searchParams.get('categoria')

  const year = ano ? parseInt(ano) : new Date().getFullYear()

  try {
    switch (type) {
      case 'despesas': {
        const where: Prisma.DespesaWhereInput = { exercicio: year }
        if (search) {
          where.OR = [
            { objeto: { contains: search } },
            { credorNome: { contains: search } },
            { numeroEmpenho: { contains: search } }
          ]
        }
        if (categoria) where.elementoDespesaNome = categoria

        const data = await prisma.despesa.findMany({ where, orderBy: { dataEmpenho: 'desc' } })
        
        if (format === 'json') {
          return NextResponse.json(data, {
            headers: {
              'Content-Disposition': `attachment; filename="despesas-${year}.json"`
            }
          })
        }
        
        const columns = ['numeroEmpenho', 'dataEmpenho', 'credorNome', 'credorCpfCnpj', 'objeto', 'orgaoNome', 'valorEmpenhado', 'valorLiquidado', 'valorPago']
        const headers = ['Nº Empenho', 'Data', 'Credor', 'CPF/CNPJ', 'Objeto', 'Órgão', 'Empenhado', 'Liquidado', 'Pago']
        
        const csv = arrayToCSV(data, columns, headers)
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="despesas-${year}.csv"`
          }
        })
      }

      case 'receitas': {
        const where: Prisma.ReceitaWhereInput = { exercicio: year }
        if (search) {
          where.OR = [
            { naturezaReceita: { contains: search } },
            { codigoNatureza: { contains: search } }
          ]
        }
        if (categoria) where.categoriaEconomica = categoria

        const data = await prisma.receita.findMany({ where, orderBy: { exercicio: 'desc' } })
        
        if (format === 'json') {
          return NextResponse.json(data, {
            headers: {
              'Content-Disposition': `attachment; filename="receitas-${year}.json"`
            }
          })
        }
        
        const columns = ['codigoNatureza', 'naturezaReceita', 'categoriaEconomica', 'valorPrevisto', 'valorArrecadado']
        const headers = ['Código', 'Natureza da Receita', 'Categoria', 'Valor Previsto', 'Valor Arrecadado']
        
        const csv = arrayToCSV(data, columns, headers)
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="receitas-${year}.csv"`
          }
        })
      }

      case 'licitacoes': {
        const where: Prisma.LicitacaoWhereInput = { ano: year }
        if (search) {
          where.OR = [
            { objeto: { contains: search } },
            { numero: { contains: search } }
          ]
        }
        if (status) where.status = status

        const data = await prisma.licitacao.findMany({ where, orderBy: { dataAbertura: 'desc' } })
        
        if (format === 'json') {
          return NextResponse.json(data, {
            headers: {
              'Content-Disposition': `attachment; filename="licitacoes-${year}.json"`
            }
          })
        }
        
        const columns = ['numero', 'ano', 'modalidade', 'objeto', 'status', 'dataAbertura', 'valorEstimado']
        const headers = ['Nº', 'Ano', 'Modalidade', 'Objeto', 'Status', 'Data Abertura', 'Valor Estimado']
        
        const csv = arrayToCSV(data, columns, headers)
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="licitacoes-${year}.csv"`
          }
        })
      }

      case 'contratos': {
        const where: Prisma.ContratoWhereInput = { ano: year }
        if (search) {
          where.OR = [
            { objeto: { contains: search } },
            { contratadoNome: { contains: search } },
            { numero: { contains: search } }
          ]
        }
        if (status) where.status = status

        const data = await prisma.contrato.findMany({ where, orderBy: { dataInicioVigencia: 'desc' } })
        
        if (format === 'json') {
          return NextResponse.json(data, {
            headers: {
              'Content-Disposition': `attachment; filename="contratos-${year}.json"`
            }
          })
        }
        
        const columns = ['numero', 'ano', 'tipoContrato', 'contratadoNome', 'contratadoCnpj', 'objeto', 'status', 'valorInicial', 'dataInicioVigencia']
        const headers = ['Nº', 'Ano', 'Tipo', 'Contratado', 'CNPJ', 'Objeto', 'Status', 'Valor', 'Início Vigência']
        
        const csv = arrayToCSV(data, columns, headers)
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="contratos-${year}.csv"`
          }
        })
      }

      case 'servidores': {
        const where: Prisma.ServidorWhereInput = { anoReferencia: year }
        if (search) {
          where.OR = [
            { nome: { contains: search } },
            { matricula: { contains: search } },
            { cargo: { contains: search } }
          ]
        }
        if (status) where.vinculo = status

        const data = await prisma.servidor.findMany({ where, orderBy: { nome: 'asc' } })
        
        if (format === 'json') {
          return NextResponse.json(data, {
            headers: {
              'Content-Disposition': `attachment; filename="servidores-${year}.json"`
            }
          })
        }
        
        const columns = ['matricula', 'nome', 'cargo', 'funcao', 'lotacao', 'vinculo', 'remuneracaoBruta', 'remuneracaoLiquida']
        const headers = ['Matrícula', 'Nome', 'Cargo', 'Função', 'Lotação', 'Vínculo', 'Rem. Bruta', 'Rem. Líquida']
        
        const csv = arrayToCSV(data, columns, headers)
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="servidores-${year}.csv"`
          }
        })
      }

      case 'convenios': {
        const where: Prisma.ConvenioWhereInput = { ano: year }
        if (search) {
          where.OR = [
            { objeto: { contains: search } },
            { concedente: { contains: search } },
            { numero: { contains: search } }
          ]
        }
        if (status) where.status = status

        const data = await prisma.convenio.findMany({ where, orderBy: { dataInicioVigencia: 'desc' } })
        
        if (format === 'json') {
          return NextResponse.json(data, {
            headers: {
              'Content-Disposition': `attachment; filename="convenios-${year}.json"`
            }
          })
        }
        
        const columns = ['numero', 'ano', 'tipo', 'concedente', 'concedenteCnpj', 'objeto', 'status', 'valorTotal', 'dataInicioVigencia']
        const headers = ['Nº', 'Ano', 'Tipo', 'Concedente', 'CNPJ', 'Objeto', 'Status', 'Valor', 'Início Vigência']
        
        const csv = arrayToCSV(data, columns, headers)
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="convenios-${year}.csv"`
          }
        })
      }

      default:
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Erro ao exportar dados' }, { status: 500 })
  }
}
