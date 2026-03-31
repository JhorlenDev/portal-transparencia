import { ReactNode, Suspense } from "react"
import { Database, FileJson, FileSpreadsheet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import DatasetGridClient from "./dataset-grid-client"

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
    icone: null,
    cor: 'emerald',
    rota: '/despesas',
    periodicidade: 'Mensal',
    totalRegistros: 15420,
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
    icone: null,
    cor: 'blue',
    rota: '/receitas',
    periodicidade: 'Diária',
    totalRegistros: 2340,
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
    icone: null,
    cor: 'purple',
    rota: '/licitacoes',
    periodicidade: 'Diária',
    totalRegistros: 245,
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
    icone: null,
    cor: 'amber',
    rota: '/contratos',
    periodicidade: 'Atualização contínua',
    totalRegistros: 125,
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
    icone: null,
    cor: 'rose',
    rota: '/servidores',
    periodicidade: 'Mensal',
    totalRegistros: 3450,
    ultimaAtualizacao: new Date().toLocaleDateString('pt-BR'),
    colunas: [
      { campo: 'matricula', tipo: 'string', descricao: 'Matrícula do Servidor', exemplo: '12345' },
      { campo: 'nome', tipo: 'string', descricao: 'Nome do Servidor', exemplo: 'João Silva' },
      { campo: 'cargo', tipo: 'string', descricao: 'Cargo/Função', exemplo: 'Professor' },
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
    icone: null,
    cor: 'cyan',
    rota: '/convenios',
    periodicidade: 'Atualização contínua',
    totalRegistros: 45,
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

export default function DadosAbertos() {
  return (
    <div className="container mx-auto px-4 py-8">
      <StructuredData 
        type="webpage" 
        data={{
          title: "Dados Abertos - Portal da Transparência",
          description: "Acesse todos os dados públicos do município em formatos abertos (CSV, JSON) e via API.",
          url: "/dados-abertos",
        }}
      />
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Database className="h-8 w-8 text-indigo-500" />
              <div>
                <p className="text-2xl font-bold">{PUBLIC_DATABASES.length}</p>
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
          <DatasetGridClient databases={PUBLIC_DATABASES} />
        </div>

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
      </Suspense>
    </div>
  )
}