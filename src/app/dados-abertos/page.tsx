import { Suspense } from "react"
import { Database, Download, FileJson, FileSpreadsheet, Clock, Info, DollarSign, TrendingUp, Scale, FileText, Users, HandCoins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { getDatasets } from "@/lib/site-data"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: "Dados Abertos | Portal da Transparência",
    description: "Acesse todos os dados públicos do município em formatos abertos (CSV, JSON) e via API.",
  }
}

const PUBLIC_DATABASES = [
  {
    slug: 'despesas',
    nome: 'Despesas Públicas',
    descricao: 'Empenhos, liquidações e pagamentos realizados pelo município. Inclui informações sobre credores, objetos e valores.',
    icone: DollarSign,
    cor: 'emerald',
    rota: '/despesas',
    periodicidade: 'Mensal',
    totalRegistros: 0,
    ultimaAtualizacao: new Date().toLocaleDateString('pt-BR'),
    colunas: [
      { campo: 'numero_empenho', tipo: 'string', descricao: 'Número do Empenho', exemplo: '2024NE00001' },
      { campo: 'data_empenho', tipo: 'date', descricao: 'Data do Empenho', exemplo: '2024-01-15' },
      { campo: 'credor_nome', tipo: 'string', descricao: 'Nome do Credor/Fornecedor', exemplo: 'Empresa XYZ LTDA' },
      { campo: 'credor_cpf_cnpj', tipo: 'string', descricao: 'CPF ou CNPJ do Credor', exemplo: '12.345.678/0001-90' },
      { campo: 'objeto', tipo: 'string', descricao: 'Objeto da Despesa', exemplo: 'Serviços de limpeza' },
      { campo: 'orgao_nome', tipo: 'string', descricao: 'Nome do Órgão', exemplo: 'Prefeitura Municipal' },
      { campo: 'valor_empenhado', tipo: 'float', descricao: 'Valor Empenhado', exemplo: '10000.00' },
      { campo: 'valor_liquidado', tipo: 'float', descricao: 'Valor Liquidado', exemplo: '8000.00' },
      { campo: 'valor_pago', tipo: 'float', descricao: 'Valor Pago', exemplo: '7500.00' },
    ]
  },
  {
    slug: 'receitas',
    nome: 'Receitas Públicas',
    descricao: 'Previsão e arrecadação das receitas municipais por natureza econômica e fonte de recurso.',
    icone: TrendingUp,
    cor: 'blue',
    rota: '/receitas',
    periodicidade: 'Mensal',
    totalRegistros: 0,
    ultimaAtualizacao: new Date().toLocaleDateString('pt-BR'),
    colunas: [
      { campo: 'codigo_natureza', tipo: 'string', descricao: 'Código da Natureza', exemplo: '1.1.1.0.00.00' },
      { campo: 'natureza_receita', tipo: 'string', descricao: 'Natureza da Receita', exemplo: 'Impostos' },
      { campo: 'categoria_economica', tipo: 'string', descricao: 'Categoria Econômica', exemplo: 'Receitas Correntes' },
      { campo: 'valor_previsto', tipo: 'float', descricao: 'Valor Previsto', exemplo: '1000000.00' },
      { campo: 'valor_arrecadado', tipo: 'float', descricao: 'Valor Arrecadado', exemplo: '950000.00' },
    ]
  },
  {
    slug: 'licitacoes',
    nome: 'Licitações e Contratações',
    descricao: 'Processos licitatórios, dispensas, inexigibilidades e adesões a atas de registro de preços.',
    icone: Scale,
    cor: 'purple',
    rota: '/licitacoes',
    periodicidade: 'Atualização contínua',
    totalRegistros: 0,
    ultimaAtualizacao: new Date().toLocaleDateString('pt-BR'),
    colunas: [
      { campo: 'numero', tipo: 'string', descricao: 'Número da Licitação', exemplo: '001/2024' },
      { campo: 'ano', tipo: 'integer', descricao: 'Ano da Licitação', exemplo: '2024' },
      { campo: 'modalidade', tipo: 'string', descricao: 'Modalidade', exemplo: 'Pregão Presencial' },
      { campo: 'objeto', tipo: 'string', descricao: 'Objeto da Licitação', exemplo: 'Contratação de serviços' },
      { campo: 'status', tipo: 'string', descricao: 'Status do Processo', exemplo: 'homologado' },
      { campo: 'data_abertura', tipo: 'date', descricao: 'Data de Abertura', exemplo: '2024-02-01' },
      { campo: 'valor_estimado', tipo: 'float', descricao: 'Valor Estimado', exemplo: '50000.00' },
    ]
  },
  {
    slug: 'contratos',
    nome: 'Contratos Administrativos',
    descricao: 'Contratos, atas de registro de preços, termos aditivos e instrumentos similares.',
    icone: FileText,
    cor: 'amber',
    rota: '/contratos',
    periodicidade: 'Atualização contínua',
    totalRegistros: 0,
    ultimaAtualizacao: new Date().toLocaleDateString('pt-BR'),
    colunas: [
      { campo: 'numero', tipo: 'string', descricao: 'Número do Contrato', exemplo: '001/2024' },
      { campo: 'ano', tipo: 'integer', descricao: 'Ano do Contrato', exemplo: '2024' },
      { campo: 'tipo_contrato', tipo: 'string', descricao: 'Tipo de Contrato', exemplo: 'Serviços' },
      { campo: 'contratado_nome', tipo: 'string', descricao: 'Nome do Contratado', exemplo: 'Empresa ABC LTDA' },
      { campo: 'contratado_cnpj', tipo: 'string', descricao: 'CNPJ do Contratado', exemplo: '12.345.678/0001-90' },
      { campo: 'objeto', tipo: 'string', descricao: 'Objeto do Contrato', exemplo: 'Serviços de vigilância' },
      { campo: 'status', tipo: 'string', descricao: 'Status', exemplo: 'vigente' },
      { campo: 'valor_inicial', tipo: 'float', descricao: 'Valor Inicial', exemplo: '120000.00' },
      { campo: 'data_inicio_vigencia', tipo: 'date', descricao: 'Início da Vigência', exemplo: '2024-01-01' },
    ]
  },
  {
    slug: 'servidores',
    nome: 'Servidores Públicos',
    descricao: 'Quadro de pessoal, remuneração e informações funcionais dos servidores municipais.',
    icone: Users,
    cor: 'rose',
    rota: '/servidores',
    periodicidade: 'Mensal',
    totalRegistros: 0,
    ultimaAtualizacao: new Date().toLocaleDateString('pt-BR'),
    colunas: [
      { campo: 'matricula', tipo: 'string', descricao: 'Matrícula do Servidor', exemplo: '12345' },
      { campo: 'nome', tipo: 'string', descricao: 'Nome do Servidor', exemplo: 'João Silva' },
      { campo: 'cargo', tipo: 'string', descricao: 'Cargo/Função', example: 'Professor' },
      { campo: 'funcao', tipo: 'string', descricao: 'Função', exemplo: 'Coordenador Pedagógico' },
      { campo: 'lotacao', tipo: 'string', descricao: 'Lotação', exemplo: 'Secretaria de Educação' },
      { campo: 'vinculo', tipo: 'string', descricao: 'Tipo de Vínculo', exemplo: 'efetivo' },
      { campo: 'remuneracao_bruta', tipo: 'float', descricao: 'Remuneração Bruta', exemplo: '5000.00' },
      { campo: 'remuneracao_liquida', tipo: 'float', descricao: 'Remuneração Líquida', exemplo: '4000.00' },
    ]
  },
  {
    slug: 'convenios',
    nome: 'Convênios e Transferências',
    descricao: 'Convênios, termos de colaboração, termos de fomento e transferências voluntárias.',
    icone: HandCoins,
    cor: 'cyan',
    rota: '/convenios',
    periodicidade: 'Atualização contínua',
    totalRegistros: 0,
    ultimaAtualizacao: new Date().toLocaleDateString('pt-BR'),
    colunas: [
      { campo: 'numero', tipo: 'string', descricao: 'Número do Convênio', exemplo: '001/2024' },
      { campo: 'ano', tipo: 'integer', descricao: 'Ano do Convênio', exemplo: '2024' },
      { campo: 'tipo', tipo: 'string', descricao: 'Tipo', exemplo: 'Termo de Colaboração' },
      { campo: 'concedente', tipo: 'string', descricao: 'Orgão Concedente', exemplo: 'Governo Federal' },
      { campo: 'objeto', tipo: 'string', descricao: 'Objeto do Convênio', exemplo: 'Construção de escola' },
      { campo: 'status', tipo: 'string', descricao: 'Status', exemplo: 'em_execucao' },
      { campo: 'valor_total', tipo: 'float', descricao: 'Valor Total', exemplo: '1000000.00' },
      { campo: 'data_inicio_vigencia', tipo: 'date', descricao: 'Início da Vigência', exemplo: '2024-01-01' },
    ]
  },
]

function getColorClasses(cor: string) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200' },
  }
  return colors[cor] || colors.emerald
}

async function DadosAbertosContent() {
  const datasets = await getDatasets()
  const allDatabases = [...PUBLIC_DATABASES]

  return (
    <>
      <StructuredData 
        type="webpage" 
        data={{
          title: "Dados Abertos - Portal da Transparência",
          description: "Acesse todos os dados públicos do município em formatos abertos (CSV, JSON) e via API.",
          url: "/dados-abertos",
        }}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-2xl font-bold">{allDatabases.length + datasets.length}</p>
              <p className="text-xs text-slate-500">Bases disponíveis</p>
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
              <p className="text-xs text-slate-500">GET livre</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Bases de Dados Públicas</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allDatabases.map((db) => {
            const colors = getColorClasses(db.cor)
            const Icone = db.icone
            
            return (
              <Card key={db.slug} className="hover:shadow-lg transition-shadow border-t-4" style={{ borderTopColor: `var(--${db.cor}-500)` }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                      <Icone className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <CardTitle className="text-lg">{db.nome}</CardTitle>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{db.descricao}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {db.periodicidade}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={db.rota} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        <Info className="h-4 w-4" />
                        Consultar
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      className="flex-1 gap-1"
                      style={{ backgroundColor: `var(--${db.cor}-600)` }}
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
      </div>

      {datasets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Datasets Adicionais</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((dataset) => (
              <Card key={dataset.id} className="hover:shadow-lg transition-shadow border-t-4 border-t-indigo-500">
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
            ))}
          </div>
        </div>
      )}

      <Card className="mt-8 bg-indigo-50 border-indigo-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-indigo-900 mb-2">Sobre os Dados Abertos</h3>
          <div className="text-sm text-indigo-800 space-y-2">
            <p><strong>Licença:</strong> Os dados estão disponibilizados sob licença Open Data Commons.</p>
            <p><strong>Atualização:</strong> Os dados são atualizados conforme a periodicidade indicada em cada base.</p>
            <p><strong>API:</strong> Todos os endpoints GET são públicos e não requerem autenticação.</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default function DadosAbertos() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Dados Abertos" }
      ]} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Database className="h-7 w-7 text-indigo-600" />
          Dados Abertos
        </h1>
        <p className="text-slate-600 mt-2 max-w-3xl">
          Acesse todos os dados públicos do município em formatos abertos (CSV e JSON) ou via API REST pública.
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <DadosAbertosContent />
      </Suspense>
    </div>
  )
}