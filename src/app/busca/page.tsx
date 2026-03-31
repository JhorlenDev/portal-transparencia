import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { getGlobalSearch } from "@/lib/site-data"

export default async function Busca({ searchParams }: { searchParams: { q?: string } }) {
  const resolvedParams = await searchParams
  const query = resolvedParams.q || ''
  const results = await getGlobalSearch(query)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">Buscar no Portal</h1>
        
        <form action="/busca" method="GET" className="mb-8">
          <div className="relative">
            <Input
              name="q"
              defaultValue={query}
              type="search"
              placeholder="Buscar despesas, licitações, contratos, servidores..."
              className="h-14 pl-5 pr-14 text-base rounded-xl"
            />
            <Button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </form>

        {query && (
          <div>
            <p className="text-slate-600 mb-4">Resultados para: <strong>"{query}"</strong></p>
            
            <div className="space-y-4">
              {results.despesas.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-emerald-800 mb-2">Despesas ({results.despesas.length})</h3>
                    <div className="space-y-2">
                      {results.despesas.map(d => (
                        <Link key={d.id} href={`/despesas?search=${encodeURIComponent(query)}#record-${d.id}`} className="block p-3 rounded-lg bg-slate-50 hover:bg-emerald-50 text-sm">
                          <p className="font-medium text-slate-800 truncate">{d.credorNome || 'Sem credor'}</p>
                          <p className="text-slate-600 truncate">{d.objeto}</p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.receitas.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-blue-800 mb-2">Receitas ({results.receitas.length})</h3>
                    <div className="space-y-2">
                      {results.receitas.map(r => (
                        <Link key={r.id} href={`/receitas?search=${encodeURIComponent(query)}#record-${r.id}`} className="block p-3 rounded-lg bg-slate-50 hover:bg-blue-50 text-sm">
                          <p className="font-medium text-slate-800 truncate">{r.naturezaReceita}</p>
                          <p className="text-slate-600 truncate">{r.categoriaEconomica}</p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.licitacoes.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-purple-800 mb-2">Licitações ({results.licitacoes.length})</h3>
                    <div className="space-y-2">
                      {results.licitacoes.map(l => (
                        <Link key={l.id} href={`/licitacoes?search=${encodeURIComponent(query)}#record-${l.id}`} className="block p-3 rounded-lg bg-slate-50 hover:bg-purple-50 text-sm">
                          <p className="font-medium text-slate-800 truncate">Pregão Nº {l.numero}/{l.ano}</p>
                          <p className="text-slate-600 truncate">{l.objeto}</p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.contratos.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-amber-800 mb-2">Contratos ({results.contratos.length})</h3>
                    <div className="space-y-2">
                      {results.contratos.map(c => (
                        <Link key={c.id} href={`/contratos?search=${encodeURIComponent(query)}#record-${c.id}`} className="block p-3 rounded-lg bg-slate-50 hover:bg-amber-50 text-sm">
                          <p className="font-medium text-slate-800 truncate">{c.contratadoNome}</p>
                          <p className="text-slate-600 truncate">{c.objeto}</p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.servidores.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-rose-800 mb-2">Servidores ({results.servidores.length})</h3>
                    <div className="space-y-2">
                      {results.servidores.map(s => (
                        <Link key={s.id} href={`/servidores?search=${encodeURIComponent(query)}#record-${s.id}`} className="block p-3 rounded-lg bg-slate-50 hover:bg-rose-50 text-sm">
                          <p className="font-medium text-slate-800 truncate">{s.nome}</p>
                          <p className="text-slate-600 truncate">{s.cargo} - {s.lotacao}</p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {Object.values(results).every(arr => arr.length === 0) && (
                <div className="text-center text-slate-600 py-8">
                  Nenhum resultado encontrado para sua busca.
                </div>
              )}
            </div>
          </div>
        )}

        {!query && (
          <div className="text-center text-slate-600">
            <p>Digite um termo para buscar no portal da transparência.</p>
          </div>
        )}
      </div>
    </div>
  )
}
