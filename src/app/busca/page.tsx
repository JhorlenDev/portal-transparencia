import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function Busca({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q || ''

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
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </form>

        {query && (
          <div>
            <p className="text-slate-600 mb-4">Resultados para: <strong>"{query}"</strong></p>
            
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <Link href="/despesas" className="block">
                    <h3 className="font-medium text-emerald-700 hover:underline">Despesas</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Encontramos <strong>15</strong> despesas relacionadas a "{query}"
                    </p>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <Link href="/licitacoes" className="block">
                    <h3 className="font-medium text-purple-600 hover:underline">Licitações</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Encontramos <strong>3</strong> licitações relacionadas a "{query}"
                    </p>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <Link href="/contratos" className="block">
                    <h3 className="font-medium text-amber-600 hover:underline">Contratos</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Encontramos <strong>8</strong> contratos relacionados a "{query}"
                    </p>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <Link href="/servidores" className="block">
                    <h3 className="font-medium text-rose-600 hover:underline">Servidores</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Encontramos <strong>2</strong> servidores relacionados a "{query}"
                    </p>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!query && (
          <div className="text-center text-slate-500">
            <p>Digite um termo para buscar no portal da transparência.</p>
          </div>
        )}
      </div>
    </div>
  )
}
