/**
 * Conjuntos de dados exportaveis. Cada um usa os mesmos filtros das paginas do portal (incluindo a
 * prioridade da Fiorilli por exercicio), entao o arquivo baixado bate com o que esta na tela.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  filtrosContrato,
  filtrosDespesa,
  filtrosDiaria,
  filtrosLicitacao,
  filtrosReceita,
  filtrosTransferencia,
} from '@/lib/site-data'
import type { Coluna } from './formatos'

export interface ParametrosExportacao {
  ano: number
  q?: string
  status?: string
  categoria?: string
  orgao?: string
  credor?: string
  fornecedor?: string
  modalidade?: string
  tipo?: string
  mes?: number
  favorecido?: string
  entidade?: string
}

export interface Conjunto<T> {
  arquivo: string
  buscar(p: ParametrosExportacao): Promise<T[]>
  colunas: Array<Coluna<T>>
}

function definir<T>(conjunto: Conjunto<T>): Conjunto<unknown> {
  return conjunto as Conjunto<unknown>
}

type Despesa = Prisma.DespesaGetPayload<object>
type Receita = Prisma.ReceitaGetPayload<object>
type Licitacao = Prisma.LicitacaoGetPayload<object>
type Contrato = Prisma.ContratoGetPayload<object>
type Servidor = Prisma.ServidorGetPayload<object>
type Convenio = Prisma.ConvenioGetPayload<object>
type Diaria = Prisma.DiariaGetPayload<object>
type Transferencia = Prisma.TransferenciaGetPayload<object>

const fonteDosDados = { titulo: 'Fonte dos dados', valor: (r: { fonte: string }) => r.fonte }

export const CONJUNTOS: Record<string, Conjunto<unknown>> = {
  despesas: definir<Despesa>({
    arquivo: 'despesas',
    buscar: async (p) => prisma.despesa.findMany({
      where: await filtrosDespesa({ exercicio: p.ano, search: p.q, categoria: p.categoria, orgao: p.orgao, credor: p.credor }),
      orderBy: [{ dataEmpenho: 'desc' }, { id: 'asc' }],
    }),
    colunas: [
      { titulo: 'Exercício', valor: (r) => r.exercicio, tipo: 'numero' },
      { titulo: 'Nº Empenho', valor: (r) => r.numeroEmpenho },
      { titulo: 'Tipo de movimento', valor: (r) => r.tipoMovimento },
      { titulo: 'Tipo de empenho', valor: (r) => r.tipoEmpenho },
      { titulo: 'Data', valor: (r) => r.dataEmpenho, tipo: 'data' },
      { titulo: 'Credor', valor: (r) => r.credorNome },
      { titulo: 'CPF/CNPJ', valor: (r) => r.credorCpfCnpj },
      { titulo: 'Órgão', valor: (r) => r.orgaoNome },
      { titulo: 'Unidade', valor: (r) => r.unidadeNome },
      { titulo: 'Função', valor: (r) => r.funcao },
      { titulo: 'Subfunção', valor: (r) => r.subfuncao },
      { titulo: 'Programa', valor: (r) => r.programa },
      { titulo: 'Ação', valor: (r) => r.acao },
      { titulo: 'Elemento (código)', valor: (r) => r.elementoDespesa },
      { titulo: 'Elemento de despesa', valor: (r) => r.elementoDespesaNome },
      { titulo: 'Fonte de recurso', valor: (r) => r.fonteRecursoNome ?? r.fonteRecurso },
      { titulo: 'Modalidade de licitação', valor: (r) => r.modalidadeLicitacao },
      { titulo: 'Objeto', valor: (r) => r.objeto },
      { titulo: 'Empenhado', valor: (r) => r.valorEmpenhado, tipo: 'moeda' },
      { titulo: 'Liquidado', valor: (r) => r.valorLiquidado, tipo: 'moeda' },
      { titulo: 'Pago', valor: (r) => r.valorPago, tipo: 'moeda' },
      { titulo: 'Anulado', valor: (r) => r.valorAnulado, tipo: 'moeda' },
      fonteDosDados,
    ],
  }),

  receitas: definir<Receita>({
    arquivo: 'receitas',
    buscar: async (p) => prisma.receita.findMany({
      where: await filtrosReceita({ exercicio: p.ano, search: p.q, categoria: p.categoria, tipo: p.tipo }),
      orderBy: [{ codigoNatureza: 'asc' }, { id: 'asc' }],
    }),
    colunas: [
      { titulo: 'Exercício', valor: (r) => r.exercicio, tipo: 'numero' },
      { titulo: 'Código', valor: (r) => r.codigoNatureza },
      { titulo: 'Natureza da receita', valor: (r) => r.naturezaReceita },
      { titulo: 'Categoria econômica', valor: (r) => r.categoriaEconomica },
      { titulo: 'Tipo', valor: (r) => r.tipoReceita },
      { titulo: 'Fonte de recurso', valor: (r) => r.fonteRecursoNome ?? r.fonteRecurso },
      { titulo: 'Previsto', valor: (r) => r.valorPrevisto, tipo: 'moeda' },
      { titulo: 'Previsto atualizado', valor: (r) => r.valorPrevistoAtualizado, tipo: 'moeda' },
      { titulo: 'Arrecadado', valor: (r) => r.valorArrecadado, tipo: 'moeda' },
      fonteDosDados,
    ],
  }),

  licitacoes: definir<Licitacao>({
    arquivo: 'licitacoes',
    buscar: async (p) => prisma.licitacao.findMany({
      where: await filtrosLicitacao({ ano: p.ano, search: p.q, status: p.status, modalidade: p.modalidade }),
      orderBy: [{ dataAbertura: 'desc' }, { id: 'asc' }],
    }),
    colunas: [
      { titulo: 'Ano', valor: (r) => r.ano, tipo: 'numero' },
      { titulo: 'Nº', valor: (r) => r.numero },
      { titulo: 'Processo', valor: (r) => r.numeroProcesso },
      { titulo: 'Modalidade', valor: (r) => r.modalidade },
      { titulo: 'Objeto', valor: (r) => r.objeto },
      { titulo: 'Status', valor: (r) => r.status },
      { titulo: 'Abertura', valor: (r) => r.dataAbertura, tipo: 'data' },
      { titulo: 'Encerramento', valor: (r) => r.dataEncerramento, tipo: 'data' },
      { titulo: 'Valor estimado', valor: (r) => r.valorEstimado, tipo: 'moeda' },
      { titulo: 'Registro de preço', valor: (r) => (r.registroPreco === null ? null : r.registroPreco ? 'Sim' : 'Não') },
      { titulo: 'Link PNCP', valor: (r) => r.linkPncp },
      fonteDosDados,
    ],
  }),

  contratos: definir<Contrato>({
    arquivo: 'contratos',
    buscar: async (p) => prisma.contrato.findMany({
      where: await filtrosContrato({ ano: p.ano, search: p.q, status: p.status, tipo: p.tipo, fornecedor: p.fornecedor, modalidade: p.modalidade }),
      orderBy: [{ dataInicioVigencia: 'desc' }, { id: 'asc' }],
    }),
    colunas: [
      { titulo: 'Ano', valor: (r) => r.ano, tipo: 'numero' },
      { titulo: 'Nº', valor: (r) => r.numero },
      { titulo: 'Modalidade', valor: (r) => r.modalidade },
      { titulo: 'Contratado', valor: (r) => r.contratadoNome },
      { titulo: 'CNPJ/CPF', valor: (r) => r.contratadoCnpj },
      { titulo: 'Objeto', valor: (r) => r.objeto },
      { titulo: 'Status', valor: (r) => r.status },
      { titulo: 'Assinatura', valor: (r) => r.dataAssinatura, tipo: 'data' },
      { titulo: 'Início da vigência', valor: (r) => r.dataInicioVigencia, tipo: 'data' },
      { titulo: 'Fim da vigência', valor: (r) => r.dataFimVigencia, tipo: 'data' },
      { titulo: 'Valor inicial', valor: (r) => r.valorInicial, tipo: 'moeda' },
      { titulo: 'Valor atual', valor: (r) => r.valorAtual, tipo: 'moeda' },
      { titulo: 'Aditado', valor: (r) => r.valorAditado, tipo: 'moeda' },
      { titulo: 'Processo licitatório', valor: (r) => r.licitacaoNumero },
      { titulo: 'Link PNCP', valor: (r) => r.linkPncp },
      fonteDosDados,
    ],
  }),

  servidores: definir<Servidor>({
    arquivo: 'servidores',
    buscar: (p) => {
      const where: Prisma.ServidorWhereInput = { anoReferencia: p.ano }
      if (p.q) where.OR = [{ nome: { contains: p.q } }, { matricula: { contains: p.q } }, { cargo: { contains: p.q } }]
      if (p.status) where.vinculo = p.status
      return prisma.servidor.findMany({ where, orderBy: [{ nome: 'asc' }, { id: 'asc' }] })
    },
    colunas: [
      { titulo: 'Matrícula', valor: (r) => r.matricula },
      { titulo: 'Nome', valor: (r) => r.nome },
      { titulo: 'Cargo', valor: (r) => r.cargo },
      { titulo: 'Função', valor: (r) => r.funcao },
      { titulo: 'Lotação', valor: (r) => r.lotacao },
      { titulo: 'Vínculo', valor: (r) => r.vinculo },
      { titulo: 'Mês de referência', valor: (r) => r.mesReferencia, tipo: 'numero' },
      { titulo: 'Remuneração bruta', valor: (r) => r.remuneracaoBruta, tipo: 'moeda' },
      { titulo: 'Remuneração líquida', valor: (r) => r.remuneracaoLiquida, tipo: 'moeda' },
    ],
  }),

  convenios: definir<Convenio>({
    arquivo: 'convenios',
    buscar: (p) => {
      const where: Prisma.ConvenioWhereInput = { ano: p.ano }
      if (p.q) where.OR = [{ objeto: { contains: p.q } }, { concedente: { contains: p.q } }, { numero: { contains: p.q } }]
      if (p.status) where.status = p.status
      return prisma.convenio.findMany({ where, orderBy: [{ dataInicioVigencia: 'desc' }, { id: 'asc' }] })
    },
    colunas: [
      { titulo: 'Nº', valor: (r) => r.numero },
      { titulo: 'Ano', valor: (r) => r.ano, tipo: 'numero' },
      { titulo: 'Tipo', valor: (r) => r.tipo },
      { titulo: 'Concedente', valor: (r) => r.concedente },
      { titulo: 'CNPJ', valor: (r) => r.concedenteCnpj },
      { titulo: 'Objeto', valor: (r) => r.objeto },
      { titulo: 'Status', valor: (r) => r.status },
      { titulo: 'Valor total', valor: (r) => r.valorTotal, tipo: 'moeda' },
      { titulo: 'Início da vigência', valor: (r) => r.dataInicioVigencia, tipo: 'data' },
    ],
  }),

  diarias: definir<Diaria>({
    arquivo: 'diarias',
    buscar: (p) => prisma.diaria.findMany({
      where: filtrosDiaria({ exercicio: p.ano, search: p.q, orgao: p.orgao, favorecido: p.favorecido }),
      orderBy: [{ data: 'desc' }, { id: 'asc' }],
    }),
    colunas: [
      { titulo: 'Exercício', valor: (r) => r.exercicio, tipo: 'numero' },
      { titulo: 'Data', valor: (r) => r.data, tipo: 'data' },
      { titulo: 'Favorecido', valor: (r) => r.favorecido },
      { titulo: 'Cargo', valor: (r) => r.cargo },
      { titulo: 'CPF', valor: (r) => r.cpf },
      { titulo: 'Órgão', valor: (r) => r.orgaoNome },
      { titulo: 'Unidade', valor: (r) => r.unidadeNome },
      { titulo: 'Descrição', valor: (r) => r.descricao },
      { titulo: 'Quantidade', valor: (r) => r.quantidade, tipo: 'numero' },
      { titulo: 'Valor', valor: (r) => r.valor, tipo: 'moeda' },
      { titulo: 'Nº Empenho', valor: (r) => r.numeroEmpenho },
    ],
  }),

  transferencias: definir<Transferencia>({
    arquivo: 'transferencias',
    buscar: (p) => prisma.transferencia.findMany({
      // Na pagina, a busca geral (q) e o filtro de entidade.
      where: filtrosTransferencia({ exercicio: p.ano, mes: p.mes, entidade: p.entidade ?? p.q }),
      orderBy: [{ data: 'desc' }, { id: 'asc' }],
    }),
    colunas: [
      { titulo: 'Exercício', valor: (r) => r.exercicio, tipo: 'numero' },
      { titulo: 'Mês', valor: (r) => r.mes, tipo: 'numero' },
      { titulo: 'Data', valor: (r) => r.data, tipo: 'data' },
      { titulo: 'Entidade pagadora', valor: (r) => r.entidadePagadora },
      { titulo: 'CNPJ pagadora', valor: (r) => r.cnpjPagadora },
      { titulo: 'Entidade recebedora', valor: (r) => r.entidadeRecebedora },
      { titulo: 'CNPJ recebedora', valor: (r) => r.cnpjRecebedora },
      { titulo: 'Repasse', valor: (r) => r.valorRepasse, tipo: 'moeda' },
      { titulo: 'Devolução', valor: (r) => r.valorDevolucao, tipo: 'moeda' },
      { titulo: 'Previsto', valor: (r) => r.valorPrevisto, tipo: 'moeda' },
    ],
  }),
}
