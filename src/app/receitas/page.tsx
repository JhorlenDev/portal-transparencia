import { TrendingUp, Download, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { getReceitas, getReceitasStats } from "@/lib/site-data"

export const dynamic = 'force-dynamic'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value)
}

export default async function Receitas() {
  const currentYear = new Date().getFullYear()
  const [receitas, stats] = await Promise.all([
    getReceitas(currentYear),
    getReceitasStats(currentYear)
  ])

  const realizacao = stats.previsto > 0 
    ? ((stats.arrecadado / stats.previsto) * 100).toFixed(1) 
    : '0'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-blue-600" />
            Receitas Públicas
          </h1>
          <p className="text-slate-600 mt-1">
            Acompanhe a previsão e arrecadação das receitas municipais.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Previsão Total ({currentYear})</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.previsto)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Arrecadado</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.arrecadado)}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Realização</p>
                <p className="text-2xl font-bold text-amber-600">{realizacao}%</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Código</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Natureza da Receita</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Categoria</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Previsto</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Arrecadado</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">% Realizado</th>
              </tr>
            </thead>
            <tbody>
              {receitas.length > 0 ? receitas.map((receita) => {
                const percentual = receita.valorPrevisto > 0 
                  ? ((receita.valorArrecadado || 0) / receita.valorPrevisto) * 100 
                  : 0
                return (
                  <tr key={receita.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-sm">{receita.codigoNatureza}</td>
                    <td className="px-4 py-3 font-medium">{receita.naturezaReceita}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">
                        {receita.categoriaEconomica}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {formatCurrency(receita.valorPrevisto)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      {formatCurrency(receita.valorArrecadado || 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${Math.min(percentual, 100)}%` }} 
                          />
                        </div>
                        <span className="text-sm font-medium">{percentual.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma receita encontrada para {currentYear}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
