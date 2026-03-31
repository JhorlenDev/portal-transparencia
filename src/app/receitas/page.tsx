import { TrendingUp, Download, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export default function Receitas() {
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
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Última atualização: 30/03/2026</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Previsão Total (2026)</p>
                <p className="text-2xl font-bold text-slate-800">R$ 45.678.901,23</p>
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
                <p className="text-2xl font-bold text-emerald-600">R$ 12.345.678,90</p>
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
                <p className="text-2xl font-bold text-amber-600">27,0%</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input type="search" placeholder="Buscar por natureza ou código..." className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline">2026</Button>
              <Button variant="outline">Todas categorias</Button>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm">1000.{i}</td>
                  <td className="px-4 py-3 font-medium">Imposto sobre Serviços</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">Corrente</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-600">
                    R$ {5000000 * i},00
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    R$ {1500000 * i},00
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${30}%` }} />
                      </div>
                      <span className="text-sm font-medium">30%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
