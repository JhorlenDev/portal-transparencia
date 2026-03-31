import { DollarSign, Download, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export default function Despesas() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-emerald-600" />
            Despesas Públicas
          </h1>
          <p className="text-slate-600 mt-1">
            Consulte empenhos, liquidações e pagamentos realizados pelo município.
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
                <p className="text-sm text-slate-500">Total Empenhado</p>
                <p className="text-2xl font-bold text-slate-800">R$ 42.345.678,90</p>
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
                <p className="text-sm text-slate-500">Total Liquidado</p>
                <p className="text-2xl font-bold text-slate-800">R$ 38.123.456,78</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Pago</p>
                <p className="text-2xl font-bold text-slate-800">R$ 35.678.901,23</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Buscar por credor, CNPJ, objeto ou empenho..."
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">2026</Button>
              <Button variant="outline">Todos os órgãos</Button>
              <Button variant="outline">Todos os tipos</Button>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Empenho</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Credor/Fornecedor</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Objeto</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Órgão</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Empenhado</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Liquidado</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Pago</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-medium">2026NE00{i}</span>
                      <p className="text-xs text-slate-500">15/01/2026</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">Empresa {i} Ltda</span>
                      <p className="text-xs text-slate-500">12.345.678/0001-{i}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                      Fornecimento de materiais e serviços diversos
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Secretaria de Educação
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      R$ {15000 * i},00
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">
                      R$ {12000 * i},00
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      R$ {10000 * i},00
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-slate-500">Exibindo 1 a 5 de 1.542 registros</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Anterior</Button>
              <span className="text-sm px-3">Página 1 de 309</span>
              <Button variant="outline" size="sm">Próxima</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8 bg-slate-50 border-dashed">
        <CardContent className="p-6">
          <h3 className="font-semibold text-slate-800 mb-2">Sobre os dados de despesas</h3>
          <div className="text-sm text-slate-600 space-y-2">
            <p><strong>Empenho:</strong> Ato que cria a obrigação de pagamento, reservando o crédito orçamentário.</p>
            <p><strong>Liquidação:</strong> Verificação do direito do credor após a prestação do serviço ou entrega do bem.</p>
            <p><strong>Pagamento:</strong> Efetiva transferência de recursos ao credor.</p>
            <p className="mt-4 text-xs text-slate-500">
              Os dados são atualizados conforme disponibilização pelo sistema contábil do município.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
