import { Suspense } from "react"
import { Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { getServidores, getServidoresStats } from "@/lib/site-data"

export const dynamic = 'force-dynamic'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value)
}

async function ServidoresContent() {
  const currentYear = new Date().getFullYear()
  const [servidores, stats] = await Promise.all([
    getServidores(currentYear),
    getServidoresStats(currentYear)
  ])

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total de Servidores</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Em {currentYear}</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Folha Bruta</p>
            <p className="text-lg font-bold">{formatCurrency(stats.totalRemuneracao)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Ano Referência</p>
            <p className="text-xl font-bold">{currentYear}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Cargo/Função</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Lotação</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Vínculo</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Rem. Bruta</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Rem. Líquida</th>
              </tr>
            </thead>
            <tbody>
              {servidores.length > 0 ? servidores.map((servidor) => (
                <tr key={servidor.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{servidor.nome}</p>
                    <p className="text-xs text-slate-500">{servidor.matricula}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{servidor.cargo}</p>
                    {servidor.funcao && <p className="text-xs text-slate-500">{servidor.funcao}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm">{servidor.lotacao || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      servidor.vinculo === 'efetivo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {servidor.vinculo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(servidor.remuneracaoBruta || 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    {formatCurrency(servidor.remuneracaoLiquida || 0)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Nenhum servidor encontrado para {currentYear}
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default function Servidores() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Users className="h-7 w-7 text-rose-600" />
            Servidores Públicos
          </h1>
          <p className="text-slate-600 mt-1">Quadro de pessoal e remuneração dos servidores municipais.</p>
        </div>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <ServidoresContent />
      </Suspense>
    </div>
  )
}
