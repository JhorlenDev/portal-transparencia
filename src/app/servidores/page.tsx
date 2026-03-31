import { Users, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total de Servidores</p><p className="text-2xl font-bold">1.245</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Efetivos</p><p className="text-2xl font-bold text-green-600">987</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Comissionados</p><p className="text-2xl font-bold text-blue-600">156</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Folha Total Bruta</p><p className="text-lg font-bold">R$ 4.567.890</p></CardContent></Card>
      </div>

      <Card className="mb-6 bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <p className="text-sm text-amber-800">
            <strong>Aviso LGPD:</strong> A divulgação de remuneração de servidores públicos é assegurada pela Lei de Acesso à Informação (Lei nº 12.527/2011).
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1"><Input type="search" placeholder="Buscar por nome, cargo ou matrícula..." /></div>
            <div className="flex gap-2">
              <Button variant="outline">Março</Button>
              <Button variant="outline">2026</Button>
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
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Cargo/Função</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Lotação</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Vínculo</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Rem. Bruta</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Rem. Líquida</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-medium">Servidor {i} da Silva</p><p className="text-xs text-slate-500">Mat. 100{i}</p></td>
                  <td className="px-4 py-3 text-sm">Professor</td>
                  <td className="px-4 py-3 text-sm">Secretaria de Educação</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Efetivo</span></td>
                  <td className="px-4 py-3 text-right font-medium">R$ {5500 + (i * 500)},00</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">R$ {4500 + (i * 400)},00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
