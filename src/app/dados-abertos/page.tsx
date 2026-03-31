import { Database, Download, FileJson, FileSpreadsheet, Clock, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDatasets } from "@/lib/site-data"

export const dynamic = 'force-dynamic'

export default async function DadosAbertos() {
  const datasets = await getDatasets()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Database className="h-7 w-7 text-indigo-600" />
          Dados Abertos
        </h1>
        <p className="text-slate-600 mt-2 max-w-3xl">
          Acesse dados públicos em formatos abertos (CSV e JSON). Os dados podem ser livremente utilizados.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-2xl font-bold">{datasets.length}</p>
              <p className="text-xs text-slate-500">Datasets disponíveis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">CSV</p>
              <p className="text-xs text-slate-500">Formato disponível</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileJson className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">JSON</p>
              <p className="text-xs text-slate-500">Formato disponível</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">API</p>
              <p className="text-xs text-slate-500">Disponível</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {datasets.length > 0 ? datasets.map((dataset) => (
          <Card key={dataset.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <span className="text-xs px-2 py-1 bg-slate-100 rounded capitalize">{dataset.categoria}</span>
                <div className="flex gap-1">
                  {dataset.formatosDisponiveis?.includes('csv') && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">CSV</span>
                  )}
                  {dataset.formatosDisponiveis?.includes('json') && (
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">JSON</span>
                  )}
                </div>
              </div>
              <CardTitle className="text-lg mt-2">{dataset.nome}</CardTitle>
              <p className="text-sm text-slate-500 line-clamp-2">{dataset.descricao}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {dataset.periodicidade}
                </div>
                <div>{dataset.totalRegistros?.toLocaleString('pt-BR') || 0} registros</div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 gap-1">
                  <Info className="h-4 w-4" />
                  Detalhes
                </Button>
                <Button size="sm" className="flex-1 gap-1 bg-indigo-600 hover:bg-indigo-700">
                  <Download className="h-4 w-4" />
                  Baixar
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full text-center py-12 text-slate-500">
            Nenhum dataset encontrado
          </div>
        )}
      </div>

      <Card className="mt-8 bg-indigo-50 border-indigo-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-indigo-900 mb-2">Sobre os Dados Abertos</h3>
          <div className="text-sm text-indigo-800 space-y-2">
            <p><strong>Licença:</strong> Os dados estão disponibilizados sob licença Open Data Commons.</p>
            <p><strong>Atualização:</strong> Os dados são atualizados conforme a periodicidade indicada.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
