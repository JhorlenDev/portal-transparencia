import { Suspense } from "react"
import { DollarSign, TrendingUp, Paperclip, Download, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { getDespesas, getDespesasStats } from "@/lib/site-data"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const currentYear = new Date().getFullYear()
  return {
    title: `Despesas Públicas ${currentYear} | Portal da Transparência`,
    description: `Consulte todas as despesas, empenhos, liquidações e pagamentos do município. Dados atualizados de ${currentYear}.`,
    openGraph: {
      title: `Despesas Públicas ${currentYear} | Portal da Transparência`,
      description: `Consulte todas as despesas, empenhos, liquidações e pagamentos do município.`,
    }
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value)
}

interface PageProps {
  searchParams: Promise<{ q?: string; ano?: string; categoria?: string; status?: string }>
}

async function DespesasContent({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = parseInt(params.ano || String(new Date().getFullYear()))
  const search = params.q || ""
  const categoria = params.categoria || ""
  
  const filters = {
    exercicio: currentYear,
    search: search || undefined,
    categoria: categoria || undefined
  }

  const [despesas, stats] = await Promise.all([
    getDespesas(filters),
    getDespesasStats(currentYear)
  ])

  const breadcrumbs = [
    { label: "Transparência", href: "/" },
    { label: "Despesas" }
  ]

  return (
    <>
      <StructuredData 
        type="webpage" 
        data={{
          title: `Despesas Públicas ${currentYear}`,
          description: `Lista de despesas públicas do município. ${despesas.length} registros encontrados.`,
          url: `/despesas${params.ano ? `?ano=${params.ano}` : ''}`,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Despesas", url: "/despesas" }
          ]
        }}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Empenhado</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.empenhado)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Liquidado</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.liquidado)}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-800" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Pago</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.pago)}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-800" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Empenho</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Credor/Fornecedor</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Objeto</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Órgão</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Empenhado</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Liquidado</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Pago</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Anexos</th>
                </tr>
              </thead>
              <tbody>
                {despesas.length > 0 ? despesas.map((despesa) => (
                  <tr key={despesa.id} id={`record-${despesa.id}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors target:bg-yellow-100 target:border-yellow-400">
                    <td className="px-4 py-3">
                      <span className="font-medium">{despesa.numeroEmpenho}</span>
                      <p className="text-xs text-slate-600">
                        {despesa.dataEmpenho ? new Date(despesa.dataEmpenho).toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{despesa.credorNome || '-'}</span>
                      <p className="text-xs text-slate-600">{despesa.credorCpfCnpj || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                      {despesa.objeto || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {despesa.orgaoNome || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(despesa.valorEmpenhado || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-amber-800">
                      {formatCurrency(despesa.valorLiquidado || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-800">
                      {formatCurrency(despesa.valorPago || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {despesa.anexos && despesa.anexos.length > 0 ? (
                        <div className="relative">
                          <button 
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              const btn = e.currentTarget
                              const dropdown = btn.nextElementSibling
                              document.querySelectorAll('[data附件-dropdown]').forEach(el => {
                                if (el !== dropdown) el.classList.add('hidden')
                              })
                              dropdown?.classList.toggle('hidden')
                            }}
                          >
                            <Paperclip className="h-3 w-3" />
                            {despesa.anexos.length}
                          </button>
                          <div 
                            data附件-dropdown
                            className="hidden fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-80 bg-white border border-slate-200 rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">Anexos ({despesa.anexos.length})</span>
                              <button 
                                className="text-slate-400 hover:text-slate-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.currentTarget.closest('[data附件-dropdown]')?.classList.add('hidden')
                                }}
                              >
                                ✕
                              </button>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                              {despesa.anexos.map((anexo) => (
                                <div key={anexo.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 border-b border-slate-100 last:border-0">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{anexo.nomeArquivo}</p>
                                    <p className="text-xs text-slate-500">{anexo.tipoMime} • {anexo.tamanho ? (anexo.tamanho / 1024).toFixed(1) + ' KB' : '-'}</p>
                                  </div>
                                  <a 
                                    href={anexo.urlArquivo} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-md flex items-center gap-1 text-xs font-medium"
                                    title="Visualizar"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Ver
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-600">
                      Nenhuma despesa encontrada para {currentYear}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8 bg-slate-50 border-dashed">
        <CardContent className="p-6">
          <h2 className="font-semibold text-slate-800 mb-2">Sobre os dados de despesas</h2>
          <div className="text-sm text-slate-600 space-y-2">
            <p><strong>Empenho:</strong> Ato que cria a obrigação de pagamento, reservando o crédito orçamentário.</p>
            <p><strong>Liquidação:</strong> Verificação do direito do credor após a prestação do serviço ou entrega do bem.</p>
            <p><strong>Pagamento:</strong> Efetiva transferência de recursos ao credor.</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default async function Despesas({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Despesas" }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-emerald-800" />
            Despesas Públicas
          </h1>
          <p className="text-slate-600 mt-1">
            Consulte empenhos, liquidações e pagamentos realizados pelo município.
          </p>
        </div>
      </div>

      <FilterBar 
        page="despesas"
        years={years}
        searchPlaceholder="Buscar por credor, objeto, número..."
      />

      <Suspense fallback={<PageSkeleton />}>
        <DespesasContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
