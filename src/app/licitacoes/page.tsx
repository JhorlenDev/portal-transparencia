import { Scale, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export default function Licitacoes() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Scale className="h-7 w-7 text-purple-600" />
            Licitações e Contratações
          </h1>
          <p className="text-slate-600 mt-1">
            Processos licitatórios, dispensas, inexigibilidades e adesões.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total em 2026</p><p className="text-2xl font-bold">24</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Em andamento</p><p className="text-2xl font-bold text-blue-600">8</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Homologados</p><p className="text-2xl font-bold text-green-600">12</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Valor Total</p><p className="text-lg font-bold">R$ 15.678.901</p></CardContent></Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1"><Input type="search" placeholder="Buscar por objeto, número..." /></div>
            <div className="flex gap-2">
              <Button variant="outline">2026</Button>
              <Button variant="outline">Todas</Button>
              <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />CSV</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nº/Ano</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Objeto</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Abertura</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Valor Estimado</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3"><span className="font-bold text-purple-600">00{i}/2026</span><p className="text-xs text-slate-500">Pregão Eletrônico</p></td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-md">Aquisição de materiais de escritório para Secretaria de Educação</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Homologado</span></td>
                  <td className="px-4 py-3 text-sm">10/02/2026 09:00</td>
                  <td className="px-4 py-3 text-right font-medium">R$ {250000 * i},00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
