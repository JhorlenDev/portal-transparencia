import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  console.log('Seed started...')

  // Create Orgaos
  const orgaos = await Promise.all([
    prisma.orgao.create({
      data: { nome: 'Prefeitura Municipal', sigla: 'PM', ativo: true },
    }),
    prisma.orgao.create({
      data: { nome: 'Secretaria Municipal de Educação', sigla: 'SME', ativo: true },
    }),
    prisma.orgao.create({
      data: { nome: 'Secretaria Municipal de Saúde', sigla: 'SMS', ativo: true },
    }),
    prisma.orgao.create({
      data: { nome: 'Secretaria Municipal de Obras', sigla: 'SMO', ativo: true },
    }),
    prisma.orgao.create({
      data: { nome: 'Secretaria Municipal de Administração', sigla: 'SMA', ativo: true },
    }),
  ])

  console.log('Created orgãos:', orgaos.length)

  // Create Receitas
  const receitas = await Promise.all([
    prisma.receita.create({
      data: {
        exercicio: 2026,
        codigoNatureza: '1000.00.00',
        naturezaReceita: 'Imposto sobre a Renda e Proventos de Qualquer Natureza',
        categoriaEconomica: 'corrente',
        fonteRecurso: '001',
        fonteRecursoNome: 'Tesouro',
        valorPrevisto: 5000000,
        valorArrecadado: 1500000,
      },
    }),
    prisma.receita.create({
      data: {
        exercicio: 2026,
        codigoNatureza: '1100.00.00',
        naturezaReceita: 'Imposto sobre Serviços de Qualquer Natureza',
        categoriaEconomica: 'corrente',
        fonteRecurso: '001',
        fonteRecursoNome: 'Tesouro',
        valorPrevisto: 3000000,
        valorArrecadado: 890000,
      },
    }),
    prisma.receita.create({
      data: {
        exercicio: 2026,
        codigoNatureza: '1600.00.00',
        naturezaReceita: 'Taxa de Fiscalização de Vigiliância Sanitária',
        categoriaEconomica: 'corrente',
        fonteRecurso: '002',
        fonteRecursoNome: ' Saúde',
        valorPrevisto: 200000,
        valorArrecadado: 65000,
      },
    }),
    prisma.receita.create({
      data: {
        exercicio: 2026,
        codigoNatureza: '2400.00.00',
        naturezaReceita: 'Transferências de Convênios da União',
        categoriaEconomica: 'capital',
        fonteRecurso: '005',
        fonteRecursoNome: 'Convênios',
        valorPrevisto: 2000000,
        valorArrecadado: 500000,
      },
    }),
  ])

  console.log('Created receitas:', receitas.length)

  // Create Despesas
  const despesas = await Promise.all([
    prisma.despesa.create({
      data: {
        exercicio: 2026,
        numeroEmpenho: '2026NE0001',
        dataEmpenho: new Date('2026-01-15'),
        tipoMovimento: 'empenho',
        credorNome: 'Empresa ABC Ltda',
        credorCpfCnpj: '12.345.678/0001-90',
        objeto: 'Fornecimento de materiais de escritório',
        orgaoNome: 'Secretaria Municipal de Educação',
        elementoDespesa: '33.90.30',
        elementoDespesaNome: 'Material de Consumo',
        valorEmpenhado: 15000,
        valorLiquidado: 12000,
        valorPago: 10000,
      },
    }),
    prisma.despesa.create({
      data: {
        exercicio: 2026,
        numeroEmpenho: '2026NE0002',
        dataEmpenho: new Date('2026-01-20'),
        tipoMovimento: 'empenho',
        credorNome: 'Construção e Engenharia S/A',
        credorCpfCnpj: '23.456.789/0001-00',
        objeto: 'Obra de pavimentação urbana',
        orgaoNome: 'Secretaria Municipal de Obras',
        elementoDespesa: '44.90.51',
        elementoDespesaNome: 'Obras e Instalações',
        valorEmpenhado: 250000,
        valorLiquidado: 100000,
        valorPago: 50000,
      },
    }),
    prisma.despesa.create({
      data: {
        exercicio: 2026,
        numeroEmpenho: '2026NE0003',
        dataEmpenho: new Date('2026-02-01'),
        tipoMovimento: 'empenho',
        credorNome: 'Posto de Combustível XX',
        credorCpfCnpj: '34.567.890/0001-01',
        objeto: 'Combustível para veículos da frota municipal',
        orgaoNome: 'Secretaria Municipal de Saúde',
        elementoDespesa: '33.90.30',
        elementoDespesaNome: 'Material de Consumo',
        valorEmpenhado: 8500,
        valorLiquidado: 8500,
        valorPago: 6000,
      },
    }),
    prisma.despesa.create({
      data: {
        exercicio: 2026,
        numeroEmpenho: '2026NE0004',
        dataEmpenho: new Date('2026-02-10'),
        tipoMovimento: 'empenho',
        credorNome: 'Serviços Médicos Ltda',
        credorCpfCnpj: '45.678.901/0001-12',
        objeto: 'Serviços de atendimento médico hospitalar',
        orgaoNome: 'Secretaria Municipal de Saúde',
        elementoDespesa: '33.90.39',
        elementoDespesaNome: 'Outros Serviços de Terceiros - PJ',
        valorEmpenhado: 120000,
        valorLiquidado: 80000,
        valorPago: 60000,
      },
    }),
    prisma.despesa.create({
      data: {
        exercicio: 2026,
        numeroEmpenho: '2026NE0005',
        dataEmpenho: new Date('2026-02-15'),
        tipoMovimento: 'empenho',
        credorNome: 'Distribuidora de Alimentos Brasil',
        credorCpfCnpj: '56.789.012/0001-23',
        objeto: 'Aquisição de gêneros alimentícios para merenda escolar',
        orgaoNome: 'Secretaria Municipal de Educação',
        elementoDespesa: '33.90.30',
        elementoDespesaNome: 'Material de Consumo',
        valorEmpenhado: 45000,
        valorLiquidado: 30000,
        valorPago: 20000,
      },
    }),
  ])

  console.log('Created despesas:', despesas.length)

  // Create Licitações
  const licitacoes = await Promise.all([
    prisma.licitacao.create({
      data: {
        numero: '001',
        ano: 2026,
        modalidade: 'pregao_eletronico',
        criterioJulgamento: 'menor_preco',
        objeto: 'Aquisição de materiais de escritório para atender as necessidades da Prefeitura Municipal',
        objetoResumido: 'Materiais de escritório',
        status: 'homologado',
        dataAbertura: new Date('2026-01-20'),
        valorEstimado: 150000,
        numeroProcesso: '01234.5678/2026',
        orgaoNome: 'Prefeitura Municipal',
      },
    }),
    prisma.licitacao.create({
      data: {
        numero: '002',
        ano: 2026,
        modalidade: 'tomada_precos',
        criterioJulgamento: 'menor_preco',
        objeto: 'Contratação de empresa para execução de obras de pavimentação em diversas ruas do município',
        objetoResumido: 'Pavimentação de ruas',
        status: 'em_andamento',
        dataAbertura: new Date('2026-02-15'),
        valorEstimado: 800000,
        numeroProcesso: '01234.5679/2026',
        orgaoNome: 'Secretaria Municipal de Obras',
      },
    }),
    prisma.licitacao.create({
      data: {
        numero: '003',
        ano: 2026,
        modalidade: 'pregao_eletronico',
        criterioJulgamento: 'menor_preco',
        objeto: 'Fornecimento de combustível para a frota municipal',
        objetoResumido: 'Combustível',
        status: 'publicado',
        dataAbertura: new Date('2026-03-01'),
        valorEstimado: 300000,
        numeroProcesso: '01234.5680/2026',
        orgaoNome: 'Prefeitura Municipal',
      },
    }),
  ])

  console.log('Created licitações:', licitacoes.length)

  // Create Contratos
  const contratos = await Promise.all([
    prisma.contrato.create({
      data: {
        numero: '001',
        ano: 2026,
        tipoContrato: 'servico',
        objeto: 'Prestação de serviços de limpeza e conservação predial',
        objetoResumido: 'Limpeza predial',
        status: 'vigente',
        dataInicioVigencia: new Date('2026-01-01'),
        dataFimVigencia: new Date('2026-12-31'),
        valorInicial: 180000,
        valorAtual: 180000,
        contratadoNome: 'Limpeza Total Ltda',
        contratadoCnpj: '12.345.678/0001-90',
        orgaoNome: 'Prefeitura Municipal',
      },
    }),
    prisma.contrato.create({
      data: {
        numero: '002',
        ano: 2026,
        tipoContrato: 'fornecimento',
        objeto: 'Fornecimento de materiais de construção',
        objetoResumido: 'Materiais de construção',
        status: 'vigente',
        dataInicioVigencia: new Date('2026-01-15'),
        dataFimVigencia: new Date('2026-12-31'),
        valorInicial: 250000,
        valorAtual: 180000,
        valorPago: 120000,
        contratadoNome: 'Casa de Construção Brasil',
        contratadoCnpj: '23.456.789/0001-00',
        orgaoNome: 'Secretaria Municipal de Obras',
      },
    }),
    prisma.contrato.create({
      data: {
        numero: '003',
        ano: 2026,
        tipoContrato: 'servico',
        objeto: 'Serviços de vigilância armada',
        objetoResumido: 'Vigilância armada',
        status: 'vigente',
        dataInicioVigencia: new Date('2026-02-01'),
        dataFimVigencia: new Date('2027-01-31'),
        valorInicial: 95000,
        valorAtual: 95000,
        contratadoNome: 'Segurança Max Ltda',
        contratadoCnpj: '34.567.890/0001-01',
        orgaoNome: 'Prefeitura Municipal',
      },
    }),
  ])

  console.log('Created contratos:', contratos.length)

  // Create Servidores
  const servidores = await Promise.all([
    prisma.servidor.create({
      data: {
        nome: 'Maria da Silva Santos',
        matricula: '1001',
        cargo: 'Professor',
        funcao: 'Docência 1º ao 5º ano',
        orgaoNome: 'Secretaria Municipal de Educação',
        lotacao: 'Escola Municipal João XXIII',
        vinculo: 'efetivo',
        cargaHoraria: 40,
        dataAdmissao: new Date('2015-03-01'),
        anoReferencia: 2026,
        mesReferencia: 3,
        remuneracaoBase: 4500,
        gratificacoes: 500,
        adicionais: 300,
        indenizacoes: 200,
        remuneracaoBruta: 5500,
        impostoRenda: 450,
        previdencia: 605,
        outrosDescontos: 100,
        remuneracaoLiquida: 4345,
      },
    }),
    prisma.servidor.create({
      data: {
        nome: 'João Pedro Oliveira',
        matricula: '1002',
        cargo: 'Enfermeiro',
        funcao: 'Coordenador de enfermagem',
        orgaoNome: 'Secretaria Municipal de Saúde',
        lotacao: 'Hospital Municipal',
        vinculo: 'efetivo',
        cargaHoraria: 40,
        dataAdmissao: new Date('2018-06-15'),
        anoReferencia: 2026,
        mesReferencia: 3,
        remuneracaoBase: 6000,
        gratificacoes: 800,
        adicionais: 500,
        indenizacoes: 400,
        remuneracaoBruta: 7700,
        impostoRenda: 950,
        previdencia: 847,
        outrosDescontos: 200,
        remuneracaoLiquida: 5703,
      },
    }),
    prisma.servidor.create({
      data: {
        nome: 'Ana Costa Souza',
        matricula: '1003',
        cargo: 'Auxiliar Administrativo',
        orgaoNome: 'Prefeitura Municipal',
        lotacao: 'Secretaria de Administração',
        vinculo: 'efetivo',
        cargaHoraria: 40,
        dataAdmissao: new Date('2020-01-10'),
        anoReferencia: 2026,
        mesReferencia: 3,
        remuneracaoBase: 2800,
        gratificacoes: 0,
        adicionais: 200,
        indenizacoes: 150,
        remuneracaoBruta: 3150,
        impostoRenda: 180,
        previdencia: 346,
        outrosDescontos: 50,
        remuneracaoLiquida: 2574,
      },
    }),
  ])

  console.log('Created servidores:', servidores.length)

  // Create Convênios
  const convenios = await Promise.all([
    prisma.convenio.create({
      data: {
        numero: '001',
        ano: 2026,
        tipo: 'convenio',
        objeto: 'Aquisição de equipamentos para unidades de saúde',
        objetoResumido: 'Equipamentos de saúde',
        status: 'em_execucao',
        concedente: 'Governo Federal',
        concedenteCnpj: '00.394.460/0001-05',
        convenente: 'Prefeitura Municipal',
        dataInicioVigencia: new Date('2026-01-01'),
        dataFimVigencia: new Date('2026-12-31'),
        valorTotal: 500000,
        valorRepasse: 450000,
        valorContrapartida: 50000,
        valorExecutado: 150000,
        numeroProcesso: '12345.678/2025',
      },
    }),
    prisma.convenio.create({
      data: {
        numero: '002',
        ano: 2026,
        tipo: 'termo_colaboracao',
        objeto: 'Programa de merenda escolar',
        objetoResumido: 'Merenda escolar',
        status: 'em_execucao',
        concedente: 'Governo Federal',
        concedenteCnpj: '00.394.460/0001-05',
        convenente: 'Prefeitura Municipal',
        dataInicioVigencia: new Date('2026-02-01'),
        dataFimVigencia: new Date('2026-12-31'),
        valorTotal: 300000,
        valorRepasse: 270000,
        valorContrapartida: 30000,
        valorExecutado: 80000,
        numeroProcesso: '12345.679/2025',
      },
    }),
  ])

  console.log('Created convênios:', convenios.length)

  // Create Datasets
  const datasets = await Promise.all([
    prisma.dataset.create({
      data: {
        nome: 'Despesas Públicas',
        slug: 'despesas',
        descricao: 'Empenhos, liquidações e pagamentos realizados pelo município',
        categoria: 'despesas',
        periodicidade: 'diaria',
        ultimaAtualizacao: new Date(),
        formatosDisponiveis: 'csv,json',
        totalRegistros: 15420,
      },
    }),
    prisma.dataset.create({
      data: {
        nome: 'Receitas Públicas',
        slug: 'receitas',
        descricao: 'Arrecadação de receitas orçamentárias por natureza e fonte',
        categoria: 'receitas',
        periodicidade: 'diaria',
        ultimaAtualizacao: new Date(),
        formatosDisponiveis: 'csv,json',
        totalRegistros: 2340,
      },
    }),
    prisma.dataset.create({
      data: {
        nome: 'Licitações',
        slug: 'licitacoes',
        descricao: 'Processos licitatórios, dispensas e inexigibilidades',
        categoria: 'licitacoes',
        periodicidade: 'diaria',
        ultimaAtualizacao: new Date(),
        formatosDisponiveis: 'csv,json',
        totalRegistros: 245,
      },
    }),
  ])

  console.log('Created datasets:', datasets.length)

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
