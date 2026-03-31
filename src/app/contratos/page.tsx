import { Suspense } from "react"
import { FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { getContratos, getContratosStats } from "@/lib/site-data"

export const dynamic = 'force-dynamic'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value)
}

async function ContratosContent() {
  const currentYear = new Date().getFullYear()
  const [contratos, stats] = await Promise.all([
    getContratos(currentYear),
    getContratosStats()
  ])

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Vigentes</p>
            <p className="text-2xl font-bold text-green-600">{stats.vigentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Valor Total</p>
            <p className="text-lg font-bold">{formatCurrency(stats.valorTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Encerrados</p>
            <p className="text-lg font-bold">{stats.encerrados}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nº/Ano</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Contratado</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Objeto</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Valor</th>
              </tr>
            </thead>
            <tbody>
              {contratos.length > 0 ? contratos.map((contrato) => (
                <tr key={contrato.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-bold text-amber-600">{contrato.numero}/{contrato.ano}</span>
                    <p className="text-xs text-slate-500">{contrato.tipoContrato || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{contrato.contratadoNome}</p>
                    <p className="text-xs text-slate-500">{contrato.contratadoCnpj || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                    {contrato.objeto}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      contrato.status === 'vigente' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {contrato.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    {formatCurrency(contrato.valorInicial)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Nenhum contrato encontrado
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

export default function Contratos() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <FileText className="h-7 w-7 text-amber-600" />
            Contratos Administrativos
          </h1>
          <p className="text-slate-600 mt-1">Contratos, atas de registro de preços e aditivos.</p>
        </div>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <ContratosContent />
      </Suspense>
    </div>
  )
}
