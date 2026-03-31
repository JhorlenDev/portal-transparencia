"use client"

import { useState } from "react"
import { Database, Download, FileJson, FileSpreadsheet, Clock, Info, DollarSign, TrendingUp, Scale, FileText, Users, HandCoins, Code, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import Link from "next/link"

interface Coluna {
  campo: string
  tipo: string
  descricao: string
  exemplo: string
}

interface Dataset {
  slug: string
  nome: string
  descricao: string
  icone: any
  cor: string
  rota: string
  periodicidade: string
  totalRegistros: number
  ultimaAtualizacao: string
  colunas: Coluna[]
}

export default function DatasetGridClient({ databases }: { databases: Dataset[] }) {
  const [selectedDb, setSelectedDb] = useState<Dataset | null>(null)
  const [activeTab, setActiveTab] = useState<"dicionario" | "downloads" | "api">("dicionario")

  function handleOpenModal(db: Dataset, tab: "dicionario" | "downloads" | "api" = "dicionario") {
    setSelectedDb(db)
    setActiveTab(tab)
  }

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {databases.map((db) => {
          return (
            <Card key={db.slug} className="hover:shadow-lg transition-shadow border-t-4 border-t-indigo-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <span className="text-xs px-2 py-1 bg-slate-100 rounded capitalize">{db.slug}</span>
                  <div className="flex gap-1">
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">CSV</span>
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">JSON</span>
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{db.nome}</CardTitle>
                <p className="text-sm text-slate-500 line-clamp-2">{db.descricao}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {db.periodicidade}
                  </div>
                  <div>{db.totalRegistros?.toLocaleString('pt-BR') || 0} registros</div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-1 cursor-pointer"
                    onClick={() => handleOpenModal(db, "dicionario")}
                  >
                    <Info className="h-4 w-4" />
                    Detalhes
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 gap-1 cursor-pointer bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => handleOpenModal(db, "downloads")}
                  >
                    <Download className="h-4 w-4" />
                    Baixar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!selectedDb} onOpenChange={(open) => !open && setSelectedDb(null)}>
        {selectedDb && (
          <DialogContent className="max-w-4xl p-0">
            <div className="p-6 pb-0 mb-4">
              <div className="flex gap-2 mb-2">
                <span className="text-xs px-2 py-1 bg-slate-100 rounded border border-slate-200">{selectedDb.slug}</span>
                <span className="text-xs px-2 py-1 bg-slate-100 rounded border border-slate-200">{selectedDb.periodicidade}</span>
              </div>
              <DialogTitle className="text-2xl">{selectedDb.nome}</DialogTitle>
              <DialogDescription className="text-base mt-2">{selectedDb.descricao}</DialogDescription>
            </div>

            <div className="px-6 flex gap-2 mb-4 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab("dicionario")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "dicionario" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Dicionário de Dados
              </button>
              <button
                onClick={() => setActiveTab("downloads")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "downloads" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Downloads
              </button>
              <button
                onClick={() => setActiveTab("api")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "api" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                API
              </button>
            </div>

            <div className="px-6 pb-6">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden min-h-[300px]">
                {activeTab === "dicionario" && (
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold border-b border-slate-200 pb-2">
                      <BookOpen className="h-5 w-5" />
                      Descrição dos Campos
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 font-medium">Campo</th>
                            <th className="px-4 py-3 font-medium">Tipo</th>
                            <th className="px-4 py-3 font-medium">Descrição</th>
                            <th className="px-4 py-3 font-medium">Exemplo Real</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDb.colunas.map((col, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-mono text-xs">{col.campo}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 border border-slate-200 rounded-md text-[10px] text-slate-600 font-mono">
                                  {col.tipo}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{col.descricao}</td>
                              <td className="px-4 py-3 font-mono text-xs text-indigo-600">{col.exemplo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "downloads" && (
                  <div className="p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">Exportação Completa</h3>
                      <p className="text-sm text-slate-500">
                        Os botões abaixo permitirão o acesso total aos registros abertos desta base de dados.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-start gap-4 hover:border-green-300 transition-colors">
                        <div className="flex items-start gap-3 w-full">
                          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <FileSpreadsheet className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800">Arquivo CSV</h4>
                            <p className="text-xs text-slate-500 mt-1">Planilha de dados separados por vírgula</p>
                          </div>
                        </div>
                        <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 cursor-pointer">
                          <a href={`/api/export?type=${selectedDb.slug}&format=csv`} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" /> Baixar CSV inteiro
                          </a>
                        </Button>
                      </div>
                      
                      <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-start gap-4 hover:border-amber-300 transition-colors">
                        <div className="flex items-start gap-3 w-full">
                          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                            <FileJson className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800">Arquivo JSON</h4>
                            <p className="text-xs text-slate-500 mt-1">Dados estruturados em JSON</p>
                          </div>
                        </div>
                        <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2 cursor-pointer">
                          <a href={`/api/export?type=${selectedDb.slug}&format=json`} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" /> Baixar JSON inteiro
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "api" && (
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Code className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">API Pública (REST)</h3>
                        <p className="text-sm text-slate-500">
                          Acesse os dados desta coleção dinamicamente com filtros de busca e paginação.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase text-slate-500">Endpoint GET</span>
                        <Link href="/document-api" className="text-xs text-indigo-600 hover:underline">Ver Documentação Completa</Link>
                      </div>
                      <div className="bg-slate-900 rounded p-3 font-mono text-sm overflow-x-auto text-green-400">
                        {`GET https://portal-transparencia-360.vercel.app/api/${selectedDb.slug}?ano=2024&q=termo_de_busca`}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-slate-800 text-sm mb-2 border-b border-slate-200 pb-1">Filtros Suportados (Querystrings)</h4>
                        <ul className="text-sm text-slate-600 space-y-2 mb-4">
                          <li><code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-xs">ano=2024</code> ou <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-xs">exercicio=2024</code> - Filtrar pelo ano</li>
                          <li><code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-xs">q=busca</code> - Busca textual em credores, objetos, nomes, etc.</li>
                          <li><code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-xs">status=ativo</code> - Filtrar pelo status atual do registro</li>
                          <li><code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-xs">format=json|csv</code> - Forçar o formato do retorno de exportações</li>
                        </ul>
                        <p className="text-xs text-slate-500 bg-slate-50 p-2 border border-slate-200 rounded">
                          Mais detalhes sobre cada rota específica se encontram em nosso portal para desenvolvedores (<Link href="/document-api" className="text-indigo-600 hover:underline">/document-api</Link>).
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800 text-sm mb-2 border-b border-slate-200 pb-1">Retorno JSON Esperado (Exemplo)</h4>
                        <pre className="bg-slate-50 border border-slate-200 rounded p-3 font-mono text-[10px] text-slate-700 overflow-x-auto h-36">
                          {`[\n  {\n    "${selectedDb.colunas[0]?.campo}": "${selectedDb.colunas[0]?.exemplo}",\n    "${selectedDb.colunas[1]?.campo}": "${selectedDb.colunas[1]?.exemplo}",\n    ...\n  }\n]`}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 mt-4 border-t border-slate-200 pt-3">
                <span>{selectedDb.totalRegistros?.toLocaleString('pt-BR')} registros &nbsp; Atualização: {selectedDb.periodicidade}</span>
                <span>Última atualização: {selectedDb.ultimaAtualizacao}</span>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
