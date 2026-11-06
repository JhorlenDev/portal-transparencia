import { Suspense } from "react"
import { Database, FileJson, FileSpreadsheet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { DataPageHero } from "@/components/portal/data-page-hero"
import DatasetGridClient from "./dataset-grid-client"
import { prisma } from "@/lib/prisma"
import { contratosVisiveis, despesasVisiveis, licitacoesVisiveis, receitasVisiveis } from "@/lib/site-data"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: "Dados Abertos | Portal da Transparência",
    description: "Acesse todos os dados públicos do município em formatos abertos (CSV, JSON) e via API.",
  }
}

export default async function DadosAbertos() {
  const [
    totalDespesas,
    totalReceitas,
    totalLicitacoes,
    totalContratos,
    totalServidores,
    totalConvenios,
    totalDiarias,
    totalTransferencias,
    exDespesa,
    exReceita,
    exLicitacao,
    exContrato,
    exServidor,
    exConvenio,
    exDiaria,
    exTransferencia
  ] = await Promise.all([
    despesasVisiveis().then((where) => prisma.despesa.count({ where })),
    receitasVisiveis().then((where) => prisma.receita.count({ where })),
    licitacoesVisiveis().then((where) => prisma.licitacao.count({ where })),
    contratosVisiveis().then((where) => prisma.contrato.count({ where })),
    prisma.servidor.count(),
    prisma.convenio.count(),
    prisma.diaria.count(),
    prisma.transferencia.count(),
    despesasVisiveis().then((where) => prisma.despesa.findFirst({ where, orderBy: { dataEmpenho: 'desc' }, select: { dataEmpenho: true, numeroEmpenho: true, credorNome: true, credorCpfCnpj: true, objeto: true, orgaoNome: true, valorEmpenhado: true, valorLiquidado: true, valorPago: true } })),
    receitasVisiveis().then((where) => prisma.receita.findFirst({ where, orderBy: { exercicio: 'desc' }, select: { codigoNatureza: true, naturezaReceita: true, categoriaEconomica: true, valorPrevisto: true, valorArrecadado: true } })),
    licitacoesVisiveis().then((where) => prisma.licitacao.findFirst({ where, orderBy: { dataAbertura: 'desc' }, select: { numero: true, ano: true, modalidade: true, objeto: true, status: true, dataAbertura: true, valorEstimado: true } })),
    contratosVisiveis().then((where) => prisma.contrato.findFirst({ where, orderBy: { dataInicioVigencia: 'desc' }, select: { numero: true, ano: true, tipoContrato: true, contratadoNome: true, contratadoCnpj: true, objeto: true, status: true, valorInicial: true, dataInicioVigencia: true } })),
    prisma.servidor.findFirst({ orderBy: { updatedAt: 'desc' }, select: { matricula: true, nome: true, cargo: true, funcao: true, lotacao: true, vinculo: true, remuneracaoBruta: true, remuneracaoLiquida: true, updatedAt: true } }),
    prisma.convenio.findFirst({ orderBy: { dataInicioVigencia: 'desc' }, select: { numero: true, ano: true, tipo: true, concedente: true, objeto: true, status: true, valorTotal: true, dataInicioVigencia: true } }),
    prisma.diaria.findFirst({ orderBy: { data: 'desc' }, select: { data: true, favorecido: true, cargo: true, cpf: true, orgaoNome: true, descricao: true, quantidade: true, valor: true } }),
    prisma.transferencia.findFirst({ orderBy: { data: 'desc' }, select: { data: true, mes: true, entidadePagadora: true, entidadeRecebedora: true, valorRepasse: true, valorDevolucao: true } })
  ])

  const formatDate = (date: Date | null | undefined) => date ? date.toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')
  const formatStr = (val: unknown, fallback: string) => val ? String(val) : fallback

  const PUBLIC_DATABASES = [
    {
      slug: 'despesas',
      nome: 'Despesas Públicas',
      descricao: 'Empenhos, liquidações e pagamentos realizados pelo município. Inclui informações sobre credores, objetos e valores.',
      icone: null,
      cor: 'emerald',
      rota: '/despesas',
      periodicidade: 'Mensal',
      totalRegistros: totalDespesas,
      ultimaAtualizacao: formatDate(exDespesa?.dataEmpenho),
      colunas: [
        { campo: 'numero_empenho', tipo: 'string', descricao: 'Número do Empenho', exemplo: formatStr(exDespesa?.numeroEmpenho, '2024NE00001') },
        { campo: 'data_empenho', tipo: 'date', descricao: 'Data do Empenho', exemplo: formatDate(exDespesa?.dataEmpenho) },
        { campo: 'credor_nome', tipo: 'string', descricao: 'Nome do Credor/Fornecedor', exemplo: formatStr(exDespesa?.credorNome, 'Empresa XYZ LTDA') },
        { campo: 'credor_cpf_cnpj', tipo: 'string', descricao: 'CPF ou CNPJ do Credor', exemplo: formatStr(exDespesa?.credorCpfCnpj, '12.345.678/0001-90') },
        { campo: 'objeto', tipo: 'string', descricao: 'Objeto da Despesa', exemplo: formatStr(exDespesa?.objeto, 'Serviços de limpeza') },
        { campo: 'orgao_nome', tipo: 'string', descricao: 'Nome do Órgão', exemplo: formatStr(exDespesa?.orgaoNome, 'Prefeitura Municipal') },
        { campo: 'valor_empenhado', tipo: 'float', descricao: 'Valor Empenhado', exemplo: formatStr(exDespesa?.valorEmpenhado, '10000.00') },
        { campo: 'valor_liquidado', tipo: 'float', descricao: 'Valor Liquidado', exemplo: formatStr(exDespesa?.valorLiquidado, '8000.00') },
        { campo: 'valor_pago', tipo: 'float', descricao: 'Valor Pago', exemplo: formatStr(exDespesa?.valorPago, '7500.00') },
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
      totalRegistros: totalReceitas,
      ultimaAtualizacao: formatDate(new Date()),
      colunas: [
        { campo: 'codigo_natureza', tipo: 'string', descricao: 'Código da Natureza', exemplo: formatStr(exReceita?.codigoNatureza, '1.1.1.0.00.00') },
        { campo: 'natureza_receita', tipo: 'string', descricao: 'Natureza da Receita', exemplo: formatStr(exReceita?.naturezaReceita, 'Impostos') },
        { campo: 'categoria_economica', tipo: 'string', descricao: 'Categoria Econômica', exemplo: formatStr(exReceita?.categoriaEconomica, 'Receitas Correntes') },
        { campo: 'valor_previsto', tipo: 'float', descricao: 'Valor Previsto', exemplo: formatStr(exReceita?.valorPrevisto, '1000000.00') },
        { campo: 'valor_arrecadado', tipo: 'float', descricao: 'Valor Arrecadado', exemplo: formatStr(exReceita?.valorArrecadado, '950000.00') },
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
      totalRegistros: totalLicitacoes,
      ultimaAtualizacao: formatDate(exLicitacao?.dataAbertura),
      colunas: [
        { campo: 'numero', tipo: 'string', descricao: 'Número da Licitação', exemplo: formatStr(exLicitacao?.numero, '001/2024') },
        { campo: 'ano', tipo: 'integer', descricao: 'Ano da Licitação', exemplo: formatStr(exLicitacao?.ano, '2024') },
        { campo: 'modalidade', tipo: 'string', descricao: 'Modalidade', exemplo: formatStr(exLicitacao?.modalidade, 'Pregão Presencial') },
        { campo: 'objeto', tipo: 'string', descricao: 'Objeto da Licitação', exemplo: formatStr(exLicitacao?.objeto, 'Contratação de serviços') },
        { campo: 'status', tipo: 'string', descricao: 'Status do Processo', exemplo: formatStr(exLicitacao?.status, 'homologado') },
        { campo: 'data_abertura', tipo: 'date', descricao: 'Data de Abertura', exemplo: formatDate(exLicitacao?.dataAbertura) },
        { campo: 'valor_estimado', tipo: 'float', descricao: 'Valor Estimado', exemplo: formatStr(exLicitacao?.valorEstimado, '50000.00') },
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
      totalRegistros: totalContratos,
      ultimaAtualizacao: formatDate(exContrato?.dataInicioVigencia),
      colunas: [
        { campo: 'numero', tipo: 'string', descricao: 'Número do Contrato', exemplo: formatStr(exContrato?.numero, '001/2024') },
        { campo: 'ano', tipo: 'integer', descricao: 'Ano do Contrato', exemplo: formatStr(exContrato?.ano, '2024') },
        { campo: 'tipo_contrato', tipo: 'string', descricao: 'Tipo de Contrato', exemplo: formatStr(exContrato?.tipoContrato, 'Serviços') },
        { campo: 'contratado_nome', tipo: 'string', descricao: 'Nome do Contratado', exemplo: formatStr(exContrato?.contratadoNome, 'Empresa ABC LTDA') },
        { campo: 'contratado_cnpj', tipo: 'string', descricao: 'CNPJ do Contratado', exemplo: formatStr(exContrato?.contratadoCnpj, '12.345.678/0001-90') },
        { campo: 'objeto', tipo: 'string', descricao: 'Objeto do Contrato', exemplo: formatStr(exContrato?.objeto, 'Serviços de vigilância') },
        { campo: 'status', tipo: 'string', descricao: 'Status', exemplo: formatStr(exContrato?.status, 'vigente') },
        { campo: 'valor_inicial', tipo: 'float', descricao: 'Valor Inicial', exemplo: formatStr(exContrato?.valorInicial, '120000.00') },
        { campo: 'data_inicio_vigencia', tipo: 'date', descricao: 'Início da Vigência', exemplo: formatDate(exContrato?.dataInicioVigencia) },
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
      totalRegistros: totalServidores,
      ultimaAtualizacao: formatDate(exServidor?.updatedAt),
      colunas: [
        { campo: 'matricula', tipo: 'string', descricao: 'Matrícula do Servidor', exemplo: formatStr(exServidor?.matricula, '12345') },
        { campo: 'nome', tipo: 'string', descricao: 'Nome do Servidor', exemplo: formatStr(exServidor?.nome, 'João Silva') },
        { campo: 'cargo', tipo: 'string', descricao: 'Cargo/Função', exemplo: formatStr(exServidor?.cargo, 'Professor') },
        { campo: 'funcao', tipo: 'string', descricao: 'Função', exemplo: formatStr(exServidor?.funcao, 'Coordenador Pedagógico') },
        { campo: 'lotacao', tipo: 'string', descricao: 'Lotação', exemplo: formatStr(exServidor?.lotacao, 'Secretaria de Educação') },
        { campo: 'vinculo', tipo: 'string', descricao: 'Tipo de Vínculo', exemplo: formatStr(exServidor?.vinculo, 'efetivo') },
        { campo: 'remuneracao_bruta', tipo: 'float', descricao: 'Remuneração Bruta', exemplo: formatStr(exServidor?.remuneracaoBruta, '5000.00') },
        { campo: 'remuneracao_liquida', tipo: 'float', descricao: 'Remuneração Líquida', exemplo: formatStr(exServidor?.remuneracaoLiquida, '4000.00') },
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
      totalRegistros: totalConvenios,
      ultimaAtualizacao: formatDate(exConvenio?.dataInicioVigencia),
      colunas: [
        { campo: 'numero', tipo: 'string', descricao: 'Número do Convênio', exemplo: formatStr(exConvenio?.numero, '001/2024') },
        { campo: 'ano', tipo: 'integer', descricao: 'Ano do Convênio', exemplo: formatStr(exConvenio?.ano, '2024') },
        { campo: 'tipo', tipo: 'string', descricao: 'Tipo', exemplo: formatStr(exConvenio?.tipo, 'Termo de Colaboração') },
        { campo: 'concedente', tipo: 'string', descricao: 'Orgão Concedente', exemplo: formatStr(exConvenio?.concedente, 'Governo Federal') },
        { campo: 'objeto', tipo: 'string', descricao: 'Objeto do Convênio', exemplo: formatStr(exConvenio?.objeto, 'Construção de escola') },
        { campo: 'status', tipo: 'string', descricao: 'Status', exemplo: formatStr(exConvenio?.status, 'em_execucao') },
        { campo: 'valor_total', tipo: 'float', descricao: 'Valor Total', exemplo: formatStr(exConvenio?.valorTotal, '1000000.00') },
        { campo: 'data_inicio_vigencia', tipo: 'date', descricao: 'Início da Vigência', exemplo: formatDate(exConvenio?.dataInicioVigencia) },
      ]
    },
    {
      slug: 'diarias',
      nome: 'Diárias',
      descricao: 'Diárias pagas a servidores e autoridades para viagens a serviço, com favorecido, cargo, órgão, motivo e valor.',
      icone: null,
      cor: 'rose',
      rota: '/diarias',
      periodicidade: 'Diária',
      totalRegistros: totalDiarias,
      ultimaAtualizacao: formatDate(exDiaria?.data),
      colunas: [
        { campo: 'data', tipo: 'date', descricao: 'Data do pagamento', exemplo: formatDate(exDiaria?.data) },
        { campo: 'favorecido', tipo: 'string', descricao: 'Nome do favorecido', exemplo: formatStr(exDiaria?.favorecido, 'Maria da Silva') },
        { campo: 'cargo', tipo: 'string', descricao: 'Cargo do favorecido', exemplo: formatStr(exDiaria?.cargo, 'Diretor Escolar') },
        { campo: 'cpf', tipo: 'string', descricao: 'CPF mascarado', exemplo: formatStr(exDiaria?.cpf, '123.XXX.XXX-00') },
        { campo: 'orgao_nome', tipo: 'string', descricao: 'Órgão', exemplo: formatStr(exDiaria?.orgaoNome, 'Secretaria de Educação') },
        { campo: 'descricao', tipo: 'string', descricao: 'Motivo da viagem', exemplo: formatStr(exDiaria?.descricao?.slice(0, 60), 'Participação em capacitação') },
        { campo: 'quantidade', tipo: 'float', descricao: 'Quantidade de diárias', exemplo: formatStr(exDiaria?.quantidade, '4') },
        { campo: 'valor', tipo: 'float', descricao: 'Valor pago', exemplo: formatStr(exDiaria?.valor, '1400.00') },
      ]
    },
    {
      slug: 'transferencias',
      nome: 'Transferências entre Entidades',
      descricao: 'Repasses financeiros entre a Prefeitura e os fundos e entidades do município, com data, valor e devoluções.',
      icone: null,
      cor: 'indigo',
      rota: '/transferencias',
      periodicidade: 'Diária',
      totalRegistros: totalTransferencias,
      ultimaAtualizacao: formatDate(exTransferencia?.data),
      colunas: [
        { campo: 'data', tipo: 'date', descricao: 'Data do lançamento', exemplo: formatDate(exTransferencia?.data) },
        { campo: 'mes', tipo: 'integer', descricao: 'Mês de referência', exemplo: formatStr(exTransferencia?.mes, '3') },
        { campo: 'entidade_pagadora', tipo: 'string', descricao: 'Entidade que repassou', exemplo: formatStr(exTransferencia?.entidadePagadora, 'Prefeitura Municipal') },
        { campo: 'entidade_recebedora', tipo: 'string', descricao: 'Entidade que recebeu', exemplo: formatStr(exTransferencia?.entidadeRecebedora, 'Fundo Municipal de Saúde') },
        { campo: 'valor_repasse', tipo: 'float', descricao: 'Valor repassado', exemplo: formatStr(exTransferencia?.valorRepasse, '250000.00') },
        { campo: 'valor_devolucao', tipo: 'float', descricao: 'Valor devolvido', exemplo: formatStr(exTransferencia?.valorDevolucao, '0') },
      ]
    },
  ]

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

      <DataPageHero
        icon={<Database className="h-6 w-6" />}
        eyebrow="Catálogo público"
        title="Dados Abertos"
        description="Acesse bases públicas do município em formatos abertos, com dicionário de dados, periodicidade de atualização e API REST pública."
        accent="indigo"
        badges={["CSV", "JSON", "API pública", "Dicionário de dados"]}
      />

      <Suspense fallback={<PageSkeleton />}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Database className="h-8 w-8 text-indigo-500" />
              <div>
                <p className="text-2xl font-bold">{PUBLIC_DATABASES.length}</p>
                <p className="text-xs text-slate-600">Bases disponíveis</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">CSV</p>
                <p className="text-xs text-slate-600">Formato disponível</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileJson className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">JSON</p>
                <p className="text-xs text-slate-600">Formato disponível</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Database className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">API</p>
                <p className="text-xs text-slate-600">GET livre</p>
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
