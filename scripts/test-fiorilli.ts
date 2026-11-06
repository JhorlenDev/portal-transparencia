#!/usr/bin/env npx tsx
/**
 * Suite de testes da integracao com a API Fiorilli SCPI (normalizadores, cliente HTTP,
 * mapeamento, agendador e sincronizacao).
 *
 * Por padrao nao acessa a rede externa: o cliente e testado contra um servidor HTTP local
 * que simula as falhas do IIS. Com --integracao, tambem chama a API real de Tefe.
 * Com --banco, testa no banco de DATABASE_URL a convivencia das fontes e a sincronizacao contra
 * o servidor falso. So cria e apaga registros proprios: id_external_ref com prefixo
 * "teste-fiorilli-" e o exercicio ficticio 2099.
 *
 * Uso:  npx tsx scripts/test-fiorilli.ts
 *       npx tsx scripts/test-fiorilli.ts --integracao --banco
 */

import 'dotenv/config'

import http from 'node:http'
import { crc32, inflateRawSync } from 'node:zlib'
import type { AddressInfo } from 'node:net'
import { configuracaoAgendador, exerciciosDaExecucao, parsearAnos, parsearHorarios, proximaExecucao } from '../src/lib/fiorilli/agendador'
import { buscarListagem, dataComPontos, FiorilliApiError, montarUrl, periodoDoExercicio, periodoDoMes, type FiorilliRegistro } from '../src/lib/fiorilli/client'
import { mapearContrato, statusContrato } from '../src/lib/fiorilli/contratos'
import { chaveEmpenho, codigoOrgao, conferirComTotaisPorOrgao, mapearEmpenho } from '../src/lib/fiorilli/despesas'
import { mapearDiaria } from '../src/lib/fiorilli/diarias'
import { buscarMovimentosEmpenho } from '../src/lib/fiorilli/movimentos-empenho'
import { mapearLicitacao, statusLicitacao } from '../src/lib/fiorilli/licitacoes'
import { chavesTransferencias } from '../src/lib/fiorilli/transferencias'
import { anoAtualManaus, limparTexto, parseAno, parseBool, parseData, parseDocumento, parseInteiro, parseMoney } from '../src/lib/fiorilli/parse'
import { categoriaEconomica, conferirArvore, mapearReceita } from '../src/lib/fiorilli/receitas'
import type { ModuloFiorilli } from '../src/lib/fiorilli/sync'
import { gerarCsv, gerarXlsx, type Coluna } from '../src/lib/exportacao/formatos'
import { grupo, igual, resumo, teste, verificar } from './test-utils'

const INTEGRACAO = process.argv.includes('--integracao')
const BANCO = process.argv.includes('--banco')

// ---------------------------------------------------------------- servidor falso

type Resposta = { status: number; corpo: string; atrasoMs?: number }

interface ServidorFalso {
  url: string
  chamadas: string[]
  roteiro: Resposta[]
  /** Respostas por Listagem; quando preenchido, tem prioridade sobre o roteiro. */
  rotas: Record<string, unknown[]>
  fechar(): Promise<void>
}

/** Responde em ordem as respostas do roteiro (a ultima se repete) ou pela Listagem pedida. */
async function servidorFalso(): Promise<ServidorFalso> {
  const estado: ServidorFalso = { url: '', chamadas: [], roteiro: [], rotas: {}, fechar: async () => {} }

  const servidor = http.createServer((req, res) => {
    estado.chamadas.push(req.url || '')
    const listagem = new URL(req.url || '/', 'http://local').searchParams.get('Listagem') || ''
    const indice = Math.min(estado.chamadas.length - 1, estado.roteiro.length - 1)
    const resposta = listagem in estado.rotas
      ? { status: 200, corpo: JSON.stringify(estado.rotas[listagem]) }
      : estado.roteiro[indice] ?? { status: 200, corpo: '[]' }
    setTimeout(() => {
      res.writeHead(resposta.status, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(resposta.corpo)
    }, resposta.atrasoMs ?? 0)
  })

  await new Promise<void>((resolve) => servidor.listen(0, '127.0.0.1', resolve))
  const { port } = servidor.address() as AddressInfo
  estado.url = `http://127.0.0.1:${port}/VersaoJson`
  estado.fechar = () => new Promise((resolve) => {
    servidor.closeAllConnections()
    servidor.close(() => resolve())
  })
  return estado
}

function prepararRoteiro(servidor: ServidorFalso, roteiro: Resposta[]) {
  servidor.chamadas.length = 0
  servidor.roteiro = roteiro
  servidor.rotas = {}
}

// ---------------------------------------------------------------- dados de exemplo

/** Linha de DespesasGerais com o formato real da API (campos irrelevantes omitidos). */
function empenho(campos: Partial<Record<string, string>>): FiorilliRegistro {
  return {
    EMPRESA: '1', PKEMP: '1', CODIGO: '1', TPEM: 'OR', CODLO: '020201', NOMELOCAL: 'MANUTENÇÃO DA SEC. MUNIC.',
    NOMEFOR: 'FORNECEDOR LTDA', CPFFORMATADO: '04.020.426/0001-68', DATAE: '02/01/2099 00:00:00',
    PRODU: 'SERVIÇO DE ASSESSORIA', CATEC: '3.3.90.39.99', NATUREZA: 'OUTROS SERVIÇOS DE TERCEIROS - PJ',
    FUNCAONOME: 'Administração', SUBFUNCAONOME: 'Administração Geral', PROGRAMANOME: 'APOIO ADMINISTRATIVO',
    PROJETO_ATIVIDADE_NOME: 'MANUTENÇÃO', FONTE_STN: '1.500', FONTE_STNDESC: 'Recursos não Vinculados de Impostos',
    LICIT: '', NUMLICIT: '', EMPENHADO: '1000', LIQUIDADO: '800', PAGO: '500', ANULADO: '0',
    ...campos,
  }
}

function totalOrgao(codigo: string, descricao: string, empenhado: string, liquidado: string, pago: string): FiorilliRegistro {
  return { EMPRESA: '1', CODIGO: codigo, DESCRICAO: descricao, EMPENHADO: empenhado, LIQUIDADO: liquidado, PAGO: pago }
}

const UI = 'Para consultar clique duas vezes na linha deste registro'

function licitacao(campos: Partial<Record<string, string>>): FiorilliRegistro {
  return {
    EMPRESA: '1', ANO: '99', NUMERO: '000182', PROCLICITACAO: '182', PROCLIC: '000182/99', LICIT: 'PREGÃO ELETRÔNICO',
    DATAE: '12/11/2099 00:00:00', DTENC: '28/11/2099 00:00:00', REGISTROPRECO: 'N', DISCR: 'AQUISIÇÃO DE MÁQUINAS',
    DISCR10: '', SITUACAO: 'Encerrada   ', VALOR: '1530000', ARQUIVO: '', EDITAL: UI, CPFCNPJ: UI,
    NOMEEMPRESA: 'PREFEITURA MUNICIPAL DE TEFÉ', ARTIGO_INCISO: '',
    ...campos,
  }
}

function contrato(campos: Partial<Record<string, string>>): FiorilliRegistro {
  return {
    EMPRESA: '1', ANO: '2099', CODIGO: '0059/99', CONTRATONUM: '173/2099', PROCLIC: '000182/99', MODALI: 'PREGÃO ELETRÔNICO',
    FORNECEDOR: 'COMAZI TRATORES LTDA', INSMF: '47.075.363/0001-50', VALCON: '919998', ADITADO: '0', EMPENHADO: '', LIQUIDADO: '',
    DTASSI: '05/12/2099 00:00:00', VIGENI: '05/03/2100 00:00:00', VIGENF: '05/03/2100 00:00:00', VENCIMENTO_ATUAL: '05/03/2100 00:00:00',
    DTPUBL: '08/12/2099 00:00:00', DTANULA: '', TIPOCO: '03', OBJETO_COMPLETO: 'AQUISIÇÃO DE MÁQUINAS E EQUIPAMENTOS',
    OBJETO: 'AQUISIÇÃO DE MÁQUINAS', ENTIDADE: 'PREFEITURA MUNICIPAL DE TEFÉ', RESPON: '',
    ...campos,
  }
}

function diaria(campos: Partial<Record<string, string>>): FiorilliRegistro {
  return {
    EMPRESA: '1', PKEMP: '11218', ORDEMPAGAMENTO: '7431', NEMPG: '3996', DATA: '01/12/2099 00:00:00', VALOR: '1400',
    VALORANULADO: '0', DESCRICAO: 'CONCESSAO DE 04 DIARIAS', NOME_ELEMENTO: 'DIÁRIAS - CIVIL', CODORGAO: '0203',
    NOMEORGAO: 'SECRETARIA MUNICIPAL DE EDUCAÇÃO', NOMEUNIDADE: 'SECRETARIA MUNICIPAL DE EDUCAÇÃO',
    FAVORECIDO: 'JANDERSON SOUZA DA SILVA', CARGO: 'DIRETOR ESCOLAR', CPFFORMATADO: '904.XXX.XXX-20', QUANT: '4',
    ...campos,
  }
}

function transferencia(campos: Partial<Record<string, string>>): FiorilliRegistro {
  return {
    MES: '1', ENTIDADE_PAGADORA: 'FUNDO MUNICIPAL DE EDUCAÇÃO', ENTIDADE_RECEBEDORA: 'PREFEITURA MUNICIPAL DE TEFÉ',
    CNPJPAGADORA: '06.076.086/0001-12', CNPJRECEBEDORA: '04.426.383/0001-15', REPASSE: '1581570', DEVOLUCAO: '0',
    PREVISTO: '641390,15', DTLAN: '17/01/2099 00:00:00',
    ...campos,
  }
}

function receita(ordem: string, codigo: string, previsto: string, arrecadado: string, extra: Partial<Record<string, string>> = {}): FiorilliRegistro {
  return {
    ORDEM: ordem, CODIGO: codigo, EMPRESA: '', FONTE: '', VINCODIGO: '', NOME: `RECEITA ${codigo}`,
    PREVISAO_INICIAL: previsto, PREVISAO_ATUALIZADA: previsto, ARRECADADO_PERIODO: arrecadado, ARRECADADO_TOTAL: arrecadado,
    ...extra,
  }
}

// ---------------------------------------------------------------- testes

async function testarParsers() {
  grupo('Normalizadores')

  await teste('parseMoney: formatos da API', async () => {
    igual(parseMoney('4742094,37'), 4742094.37, '"4742094,37"')
    igual(parseMoney('8.000.390,31'), 8000390.31, '"8.000.390,31"')
    igual(parseMoney('1530000'), 1530000, '"1530000"')
    igual(parseMoney('742631,6'), 742631.6, '"742631,6"')
    igual(parseMoney('-1937,96'), -1937.96, '"-1937,96"')
    igual(parseMoney(' 62,04 '), 62.04, 'com espacos')
    igual(parseMoney(12.5), 12.5, 'numero')
  })

  await teste('parseMoney: vazios e lixo viram null', async () => {
    igual(parseMoney(''), null, 'vazio')
    igual(parseMoney(null), null, 'null')
    igual(parseMoney(undefined), null, 'undefined')
    igual(parseMoney('abc'), null, 'texto')
    igual(parseMoney('12,3,4'), null, 'duas virgulas')
  })

  await teste('parseData: DD/MM/YYYY HH:mm:ss no fuso de Manaus', async () => {
    igual(parseData('12/11/2025 00:00:00')?.toISOString(), '2025-11-12T04:00:00.000Z', 'licitacao')
    igual(parseData('02/01/2025')?.toISOString(), '2025-01-02T04:00:00.000Z', 'sem hora')
    igual(parseData('05/03/2026 14:30:15')?.toISOString(), '2026-03-05T18:30:15.000Z', 'com hora')
  })

  await teste('parseData: DD.MM.YYYY, ano curto e ISO', async () => {
    igual(parseData('01.01.2024')?.toISOString(), '2024-01-01T04:00:00.000Z', 'pontos')
    igual(parseData('04/11/24')?.toISOString(), '2024-11-04T04:00:00.000Z', 'ano com 2 digitos')
    igual(parseData('2025-01-02')?.toISOString(), '2025-01-02T04:00:00.000Z', 'ISO')
  })

  await teste('parseData: datas invalidas viram null', async () => {
    igual(parseData('31/02/2025'), null, '31 de fevereiro')
    igual(parseData('00/01/2025'), null, 'dia zero')
    igual(parseData('12/13/2025'), null, 'mes 13')
    igual(parseData(''), null, 'vazio')
    igual(parseData('ontem'), null, 'texto')
  })

  await teste('parseBool', async () => {
    for (const v of ['True', 'true', 'S', 's', 'Sim', '1']) igual(parseBool(v), true, v)
    for (const v of ['False', 'N', 'Nao', 'Não', '0']) igual(parseBool(v), false, v)
    igual(parseBool(''), null, 'vazio')
    igual(parseBool('talvez'), null, 'texto')
  })

  await teste('parseAno e parseInteiro', async () => {
    igual(parseAno('25'), 2025, '"25"')
    igual(parseAno('2025'), 2025, '"2025"')
    igual(parseAno(''), null, 'vazio')
    igual(parseAno('abc'), null, 'texto')
    igual(parseInteiro('000182'), 182, 'zeros a esquerda')
    igual(parseInteiro('1,5'), null, 'decimal')
  })

  await teste('parseDocumento: CPF/CNPJ validos, mascarados e lixo de interface', async () => {
    igual(parseDocumento('47.075.363/0001-50'), '47.075.363/0001-50', 'CNPJ formatado')
    igual(parseDocumento('47075363000150'), '47075363000150', 'CNPJ so digitos')
    igual(parseDocumento('123.456.789-09'), '123.456.789-09', 'CPF formatado')
    igual(parseDocumento('080.XXX.XXX-66'), '080.XXX.XXX-66', 'CPF mascarado pela API')
    igual(parseDocumento('***.456.789-**'), '***.456.789-**', 'CPF mascarado com asterisco')
    igual(parseDocumento('Para consultar clique duas vezes na linha deste registro'), null, 'texto de UI')
    igual(parseDocumento(''), null, 'vazio')
    igual(parseDocumento('123'), null, 'curto')
  })

  await teste('limparTexto', async () => {
    igual(limparTexto('Encerrada   '), 'Encerrada', 'espacos no fim')
    igual(limparTexto('  a   b '), 'a b', 'espacos internos')
    igual(limparTexto('   '), null, 'so espacos')
  })
}

async function testarMontagem() {
  grupo('Montagem de URL e periodos')

  await teste('mantem parametros vazios e Listagem primeiro', async () => {
    const url = montarUrl('https://h:851/x/VersaoJson', 'Despesas', 'DespesasGerais', {
      MostrarFornecedor: true,
      UFParaFiltroCOVID: '',
      ApenasIDEmpenho: false,
    })
    igual(
      url,
      'https://h:851/x/VersaoJson/Despesas/?Listagem=DespesasGerais&MostrarFornecedor=True&UFParaFiltroCOVID=&ApenasIDEmpenho=False',
      'url'
    )
  })

  await teste('periodoDoMes calcula o ultimo dia (inclusive bissexto)', async () => {
    igual(periodoDoMes(2024, 2).DiaFinalPeriodo, '29', 'fev/2024')
    igual(periodoDoMes(2025, 2).DiaFinalPeriodo, '28', 'fev/2025')
    igual(periodoDoMes(2025, 12).DiaFinalPeriodo, '31', 'dez')
    igual(periodoDoMes(2025, 4).MesInicialPeriodo, '04', 'mes com zero')
  })

  await teste('dataComPontos', async () => {
    igual(dataComPontos(2024, 1, 1), '01.01.2024', 'data')
  })
}

async function testarCliente() {
  grupo('Cliente HTTP (servidor local)')
  const servidor = await servidorFalso()
  const opcoes = (extra: Record<string, number> = {}) => ({
    config: { baseUrl: servidor.url, empresa: 1, exercicio: 2025, timeoutMs: 2000, maxRetries: 3, ...extra },
    backoffBaseMs: 10,
  })

  try {
    await teste('devolve o array e envia ConectarExercicio/Empresa', async () => {
      prepararRoteiro(servidor, [{ status: 200, corpo: '[{"CODIGO":"1"}]' }])
      const dados = await buscarListagem('Despesas', 'DespesasPorOrgao', { Ano: 2025 }, opcoes())
      igual(dados.length, 1, 'registros')
      igual(dados[0].CODIGO, '1', 'campo')
      const chamada = servidor.chamadas[0]
      verificar(chamada.includes('Listagem=DespesasPorOrgao&ConectarExercicio=2025&Empresa=1&Ano=2025'), chamada)
    })

    await teste('params sobrescrevem ConectarExercicio e Empresa', async () => {
      prepararRoteiro(servidor, [{ status: 200, corpo: '[]' }])
      await buscarListagem('Receitas', 'ReceitaUniao', { ConectarExercicio: 2023, Empresa: 2 }, opcoes())
      verificar(servidor.chamadas[0].includes('ConectarExercicio=2023&Empresa=2'), servidor.chamadas[0])
    })

    await teste('repete apos HTTP 500 e recupera', async () => {
      prepararRoteiro(servidor, [
        { status: 500, corpo: '<html>Server Error</html>' },
        { status: 500, corpo: '<html>Server Error</html>' },
        { status: 200, corpo: '[{"A":"1"},{"A":"2"}]' },
      ])
      const dados = await buscarListagem('Pessoal', 'Servidores', {}, opcoes())
      igual(dados.length, 2, 'registros')
      igual(servidor.chamadas.length, 3, 'tentativas')
    })

    await teste('desiste apos maxRetries + 1 tentativas', async () => {
      prepararRoteiro(servidor, [{ status: 500, corpo: 'erro' }])
      try {
        await buscarListagem('Pessoal', 'Servidores', {}, opcoes())
        throw new Error('deveria ter falhado')
      } catch (erro) {
        verificar(erro instanceof FiorilliApiError, `erro inesperado: ${erro}`)
        igual(erro.status, 500, 'status')
        igual(erro.tentativas, 4, 'tentativas no erro')
      }
      igual(servidor.chamadas.length, 4, 'chamadas')
    })

    await teste('nao repete erro 4xx', async () => {
      prepararRoteiro(servidor, [{ status: 404, corpo: 'nao encontrado' }])
      try {
        await buscarListagem('Despesas', 'Inexistente', {}, opcoes())
        throw new Error('deveria ter falhado')
      } catch (erro) {
        verificar(erro instanceof FiorilliApiError, `erro inesperado: ${erro}`)
        igual(erro.status, 404, 'status')
      }
      igual(servidor.chamadas.length, 1, 'chamadas')
    })

    await teste('timeout conta como falha e e repetido', async () => {
      prepararRoteiro(servidor, [
        { status: 200, corpo: '[]', atrasoMs: 500 },
        { status: 200, corpo: '[{"OK":"S"}]' },
      ])
      const dados = await buscarListagem('Despesas', 'Diarias', {}, opcoes({ timeoutMs: 100 }))
      igual(dados[0].OK, 'S', 'segunda tentativa')
      igual(servidor.chamadas.length, 2, 'chamadas')
    })

    await teste('JSON invalido com 200 e repetido e depois falha', async () => {
      prepararRoteiro(servidor, [{ status: 200, corpo: '<html>erro do IIS</html>' }])
      try {
        await buscarListagem('Despesas', 'Diarias', {}, opcoes({ maxRetries: 1 }))
        throw new Error('deveria ter falhado')
      } catch (erro) {
        verificar(erro instanceof FiorilliApiError, `erro inesperado: ${erro}`)
        verificar(erro.message.includes('JSON'), erro.message)
      }
      igual(servidor.chamadas.length, 2, 'chamadas')
    })

    await teste('resposta que nao e array e rejeitada', async () => {
      prepararRoteiro(servidor, [{ status: 200, corpo: '{"erro":"x"}' }])
      try {
        await buscarListagem('Despesas', 'Diarias', {}, opcoes({ maxRetries: 0 }))
        throw new Error('deveria ter falhado')
      } catch (erro) {
        verificar(erro instanceof FiorilliApiError, `erro inesperado: ${erro}`)
        verificar(erro.message.includes('array'), erro.message)
      }
    })
  } finally {
    await servidor.fechar()
  }
}


async function testarMapeamento() {
  grupo('Mapeamento de despesas e receitas')
  const orgaos = new Map([['0202', 'SECRETARIA DE ADMINISTRAÇÃO']])

  await teste('empenho: campos, orgao pelo prefixo da unidade e valores', async () => {
    const linha = mapearEmpenho(empenho({ PKEMP: '13744' }), 2099, orgaos)
    verificar(linha, 'linha nula')
    igual(linha.idExternalRef, '1-2099-13744', 'chave')
    igual(linha.dados.orgaoNome, 'SECRETARIA DE ADMINISTRAÇÃO', 'orgao')
    igual(linha.dados.unidadeCodigo, '020201', 'unidade')
    igual(linha.dados.tipoMovimento, 'Empenho', 'tipoMovimento')
    igual(linha.dados.valorEmpenhado, 1000, 'empenhado')
    igual(linha.dados.credorCpfCnpj, '04.020.426/0001-68', 'credor')
    igual((linha.dados.dataEmpenho as Date).toISOString(), '2099-01-02T04:00:00.000Z', 'data')
  })

  await teste('anulacao vira tipoMovimento "Anulação" com valor negativo', async () => {
    const linha = mapearEmpenho(empenho({ TPEM: 'AN', EMPENHADO: '-77600', LIQUIDADO: '0', PAGO: '0' }), 2099, orgaos)
    igual(linha?.dados.tipoMovimento, 'Anulação', 'tipoMovimento')
    igual(linha?.dados.valorEmpenhado, -77600, 'empenhado')
  })

  await teste('chave usa PKEMP: anulacoes com o mesmo CODIGO nao colidem', async () => {
    const a = chaveEmpenho(empenho({ TPEM: 'AN', CODIGO: '13', PKEMP: '10354' }), 2099)
    const b = chaveEmpenho(empenho({ TPEM: 'AN', CODIGO: '13', PKEMP: '13075' }), 2099)
    verificar(a && b && a !== b, `chaves iguais: ${a}`)
    igual(chaveEmpenho(empenho({ PKEMP: '' }), 2099), null, 'sem PKEMP')
  })

  await teste('orgao desconhecido e documento invalido ficam null', async () => {
    const linha = mapearEmpenho(empenho({ CODLO: '090101', CPFFORMATADO: 'Para consultar clique duas vezes' }), 2099, orgaos)
    igual(linha?.dados.orgaoNome, null, 'orgao')
    igual(linha?.dados.credorCpfCnpj, null, 'documento')
    igual(codigoOrgao('02'), null, 'codigo curto')
  })

  await teste('conferencia com DespesasPorOrgao', async () => {
    const linhas = [
      mapearEmpenho(empenho({ PKEMP: '1', EMPENHADO: '1000', LIQUIDADO: '800', PAGO: '500' }), 2099, orgaos)!,
      mapearEmpenho(empenho({ PKEMP: '2', TPEM: 'AN', EMPENHADO: '-200', LIQUIDADO: '0', PAGO: '0' }), 2099, orgaos)!,
    ]
    igual(conferirComTotaisPorOrgao(linhas, [totalOrgao('0202', 'X', '800', '800', '500')]).length, 0, 'consistente')

    const divergencias = conferirComTotaisPorOrgao(linhas, [totalOrgao('0202', 'X', '1000', '800', '500')])
    igual(divergencias.length, 1, 'uma divergencia')
    verificar(divergencias[0].includes('empenhado'), divergencias[0])

    const semOrgao = conferirComTotaisPorOrgao(linhas, [])
    verificar(semOrgao.some((d) => d.includes('nao aparece')), semOrgao.join('; '))
  })

  await teste('receita: categoria economica e chave por nivel', async () => {
    igual(categoriaEconomica('1112.50.0.1.00'), 'Receitas Correntes', 'corrente')
    igual(categoriaEconomica('2419.99.0.1.00'), 'Receitas de Capital', 'capital')
    igual(categoriaEconomica('9510.00.0.0.06'), 'Deduções da Receita', 'deducao')
    // O mesmo codigo aparece nos niveis 3 e 7 da arvore real.
    const n3 = mapearReceita(receita('3', '9510.00.0.0.00', '-25091413,95', '0'), 'orcamentaria', 2099)
    const n7 = mapearReceita(receita('7', '9510.00.0.0.00', '-25091413,95', '0'), 'orcamentaria', 2099)
    verificar(n3 && n7 && n3.idExternalRef !== n7.idExternalRef, 'chaves iguais entre niveis')
    igual(n7?.dados.nivel, 7, 'nivel')
    igual(n7?.dados.valorPrevisto, -25091413.95, 'previsto')
  })

  await teste('receita: conferencia da arvore (analiticas x nivel 1)', async () => {
    const arvore = [receita('1', '1000.00.0.0.00', '300', '120'), receita('10', '1112.00.0.0.01', '100', '20'), receita('10', '1112.00.0.0.02', '200', '100')]
    igual(conferirArvore(arvore).length, 0, 'consistente')
    igual(conferirArvore([...arvore, receita('10', '1112.00.0.0.03', '5', '0')]).length, 1, 'divergente')
  })

  await teste('periodoDoExercicio cobre 01/01 a 31/12', async () => {
    const p = periodoDoExercicio(2025)
    igual(`${p.DiaInicioPeriodo}/${p.MesInicialPeriodo}-${p.DiaFinalPeriodo}/${p.MesFinalPeriodo}`, '01/01-31/12', 'periodo')
  })
}

async function testarMapeamentoCompras() {
  grupo('Mapeamento de licitacoes, contratos, diarias e transferencias')

  await teste('licitacao: ano de 2 digitos, status e campos de interface descartados', async () => {
    const linha = mapearLicitacao(licitacao({}))
    verificar(linha, 'linha nula')
    igual(linha.idExternalRef, '1-2099-000182-182', 'chave')
    igual(linha.dados.ano, 2099, 'ano')
    igual(linha.dados.status, 'encerrado', 'status')
    igual(linha.dados.numeroProcesso, '000182/99', 'processo')
    igual(linha.dados.registroPreco, false, 'registro de preco')
    igual(linha.dados.valorEstimado, 1530000, 'valor')
  })

  await teste('licitacao antiga so com numero e objeto', async () => {
    const linha = mapearLicitacao(licitacao({ ANO: '17', PROCLICITACAO: '', LICIT: '', DATAE: '', SITUACAO: '            ', VALOR: '' }))
    igual(linha?.dados.modalidade, 'Não informada', 'modalidade')
    igual(linha?.dados.status, 'nao_informado', 'status')
    igual(linha?.dados.dataAbertura, null, 'data')
    igual(linha?.dados.valorEstimado, null, 'valor')
    igual(mapearLicitacao(licitacao({ ANO: '', DISCR: 'Licitacao... ' })), null, 'linha sem ano e descartada')
  })

  await teste('status das licitacoes', async () => {
    igual(statusLicitacao('Homologada'), 'homologado', 'homologada')
    igual(statusLicitacao('Em Andamento'), 'em_andamento', 'em andamento')
    igual(statusLicitacao('Situação Nova'), 'situacao_nova', 'desconhecida vira slug')
  })

  await teste('contrato: vigencia pela assinatura e vencimento atual, valor com aditivos', async () => {
    const linha = mapearContrato(contrato({ ADITADO: '40000', EMPENHADOANT: '463244,93', EMPENHADO: '412163,88', LIQUIDADOANT: '463244,93', LIQUIDADO: '' }), new Map([['000182/99', 'lic-1']]), new Date('2099-12-10T12:00:00Z'))
    verificar(linha, 'linha nula')
    igual(linha.idExternalRef, '1-2099-0059/99', 'chave')
    igual(linha.dados.numero, '173/2099', 'numero publico')
    igual((linha.dados.dataInicioVigencia as Date).toISOString(), '2099-12-05T04:00:00.000Z', 'inicio = assinatura')
    igual((linha.dados.dataFimVigencia as Date).toISOString(), '2100-03-05T04:00:00.000Z', 'fim')
    igual(linha.dados.valorAtual, 959998, 'valor atual')
    igual(linha.dados.licitacaoId, 'lic-1', 'ligado a licitacao')
    igual(linha.dados.status, 'vigente', 'status')
    // EMPENHADO e so do exercicio; o total soma os anos anteriores (EMPENHADOANT).
    igual(linha.dados.valorEmpenhado, 875408.81, 'empenhado total')
    igual(linha.dados.valorLiquidado, 463244.93, 'liquidado total')
    igual(mapearContrato(contrato({}))?.dados.valorEmpenhado, null, 'sem valores informados')
  })

  await teste('status do contrato no fuso de Manaus', async () => {
    const fim = new Date('2099-03-05T04:00:00Z')
    igual(statusContrato(fim, null, new Date('2099-03-06T03:59:00Z')), 'vigente', 'ultimo minuto do dia em Manaus')
    igual(statusContrato(fim, null, new Date('2099-03-06T04:00:00Z')), 'encerrado', 'dia seguinte')
    igual(statusContrato(fim, new Date(), new Date('2099-01-01T00:00:00Z')), 'anulado', 'anulado')
    igual(mapearContrato(contrato({ DTASSI: '', VIGENI: '' })), null, 'sem data de inicio e descartado')
  })

  await teste('diaria: chave por empenho + ordem de pagamento, CPF mascarado mantido', async () => {
    const linha = mapearDiaria(diaria({}), 2099)
    igual(linha?.idExternalRef, '1-2099-11218-7431', 'chave')
    igual(linha?.dados.cpf, '904.XXX.XXX-20', 'cpf')
    igual(linha?.dados.quantidade, 4, 'quantidade')
    igual(mapearDiaria(diaria({ QUANT: '' }), 2099)?.dados.quantidade, null, 'quantidade vazia')
  })

  await teste('transferencias identicas no mesmo dia recebem chaves diferentes', async () => {
    const chaves = chavesTransferencias([transferencia({}), transferencia({}), transferencia({ REPASSE: '1' })], 2099)
    igual(new Set(chaves).size, 3, 'chaves unicas')
    verificar(chaves[0].endsWith('#1') && chaves[1].endsWith('#2'), chaves.join(' '))
  })
}

/** Le um ZIP (so o que gerarXlsx produz: entradas deflate sem descritor) e confere os CRCs. */
function lerZip(zip: Buffer): Map<string, string> {
  const arquivos = new Map<string, string>()
  let pos = 0
  while (zip.readUInt32LE(pos) === 0x04034b50) {
    const crc = zip.readUInt32LE(pos + 14)
    const tamanho = zip.readUInt32LE(pos + 18)
    const nomeTam = zip.readUInt16LE(pos + 26)
    const extraTam = zip.readUInt16LE(pos + 28)
    const nome = zip.subarray(pos + 30, pos + 30 + nomeTam).toString('utf8')
    const inicio = pos + 30 + nomeTam + extraTam
    const dados = inflateRawSync(zip.subarray(inicio, inicio + tamanho))
    if (crc32(dados) !== crc) throw new Error(`CRC incorreto em ${nome}`)
    arquivos.set(nome, dados.toString('utf8'))
    pos = inicio + tamanho
  }
  return arquivos
}

async function testarExportacao() {
  grupo('Exportacao (CSV e XLSX)')
  interface Linha { nome: string; valor: number | null; data: Date | null }
  const colunas: Array<Coluna<Linha>> = [
    { titulo: 'Nome', valor: (r) => r.nome },
    { titulo: 'Valor', valor: (r) => r.valor, tipo: 'moeda' },
    { titulo: 'Data', valor: (r) => r.data, tipo: 'data' },
  ]
  const linhas: Linha[] = [
    { nome: 'AÇÃO "SOCIAL", 1ª etapa', valor: -1937.96, data: parseData('02/01/2025') },
    { nome: 'linha\nquebrada & <tag>\u0001', valor: null, data: null },
  ]

  await teste('CSV: BOM, aspas, virgulas, datas ISO no fuso de Manaus e vazios', async () => {
    const csv = gerarCsv(linhas, colunas)
    verificar(csv.startsWith('\uFEFF'), 'sem BOM')
    const [cabecalho, l1, l2] = csv.slice(1).split('\r\n')
    igual(cabecalho, 'Nome,Valor,Data', 'cabecalho')
    igual(l1, '"AÇÃO ""SOCIAL"", 1ª etapa",-1937.96,2025-01-02', 'linha 1')
    verificar(l2.startsWith('"linha\nquebrada') && l2.endsWith(',,'), `linha 2: ${JSON.stringify(l2)}`)
  })

  await teste('XLSX: ZIP valido, partes obrigatorias, celulas tipadas e XML escapado', async () => {
    const partes = lerZip(gerarXlsx(linhas, colunas))
    for (const parte of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']) {
      verificar(partes.has(parte), `faltou ${parte}`)
    }
    const planilha = partes.get('xl/worksheets/sheet1.xml')!
    verificar(planilha.includes('<c r="B2" s="3"><v>-1937.96</v></c>'), 'valor em moeda')
    // 02/01/2025 = serial 45659 no Excel
    verificar(planilha.includes('<c r="C2" s="2"><v>45659</v></c>'), 'data como serial')
    verificar(planilha.includes('AÇÃO &quot;SOCIAL&quot;, 1ª etapa'), 'texto escapado')
    verificar(planilha.includes('&amp; &lt;tag&gt;') && !planilha.includes('\u0001'), 'caracteres especiais')
    verificar(!planilha.includes('r="B3"'), 'celula vazia nao gerada')
    verificar(planilha.includes('<autoFilter ref="A1:C3"/>'), 'autofiltro')
  })

  await teste('XLSX com mais de 26 colunas usa AA, AB...', async () => {
    const muitas = Array.from({ length: 28 }, (_, i): Coluna<Linha> => ({ titulo: `C${i}`, valor: () => i }))
    const planilha = lerZip(gerarXlsx([linhas[0]], muitas)).get('xl/worksheets/sheet1.xml')!
    verificar(planilha.includes('r="AA2"') && planilha.includes('r="AB2"'), 'colunas AA/AB')
  })
}

async function testarMovimentosEmpenho() {
  grupo('Movimentacao do empenho (detalhe da despesa)')
  const servidor = await servidorFalso()
  const opcoes = { config: { baseUrl: servidor.url, maxRetries: 0, timeoutMs: 2000 }, backoffBaseMs: 1 }
  const empenho = { exercicio: 2099, numeroEmpenho: '2636', tipoEmpenho: 'OR', empresa: '1' }

  try {
    await teste('converte liquidacoes e pagamentos e envia os parametros obrigatorios', async () => {
      prepararRoteiro(servidor, [])
      servidor.rotas = {
        EmpenhosDespesas_Liquidado_PorNumeroEmpenho: [
          { PKEMP: '6831', EMPENHO: '2636', DATAE: '12/06/2099 00:00:00', LIQ: '1', VALOR: '609223,06' },
        ],
        Empenhos_Pago_ComOrdemPagto_PorNumeroEmpenho: [
          { ORDPG: '33596', NUMLIQ: '1', PARCELA: '2', DATA: '14/10/2099 00:00:00', VALOR: '150000', DESCONTO: '1500', VALPAGO: '148500' },
          { ORDPG: '29415', NUMLIQ: '1', PARCELA: '1', DATA: '12/06/2099 00:00:00', VALOR: '150000', DESCONTO: '0', VALPAGO: '150000' },
        ],
      }
      const movimentos = await buscarMovimentosEmpenho(empenho, opcoes)
      igual(movimentos.liquidacoes[0].valor, 609223.06, 'liquidacao')
      igual(movimentos.pagamentos.map((p) => p.parcela).join(','), '1,2', 'pagamentos em ordem de data')
      igual(movimentos.pagamentos[1].desconto, 1500, 'desconto')
      igual(movimentos.pagamentos[1].valorPago, 148500, 'valor pago')
      const chamada = servidor.chamadas.find((c) => c.includes('Liquidado'))!
      // Numero do empenho (CODIGO), nao PKEMP; periodo e IDButton sao obrigatorios na API.
      verificar(chamada.includes('intNumeroEmpenho=2636') && chamada.includes('strTipoEmpenho=OR'), chamada)
      verificar(chamada.includes('IDButton=lnkDespesasPor_NotaEmpenho') && chamada.includes('DiaFinalPeriodo=31'), chamada)
    })

    await teste('segunda consulta vem do cache, sem chamar a API', async () => {
      servidor.chamadas.length = 0
      await buscarMovimentosEmpenho(empenho, opcoes)
      igual(servidor.chamadas.length, 0, 'chamadas')
    })

    await teste('falha da API chega a quem chamou (a pagina mostra o aviso)', async () => {
      prepararRoteiro(servidor, [{ status: 500, corpo: 'erro' }])
      try {
        await buscarMovimentosEmpenho({ ...empenho, numeroEmpenho: '9999' }, opcoes)
        throw new Error('deveria ter falhado')
      } catch (erro) {
        verificar(erro instanceof FiorilliApiError, `erro inesperado: ${erro}`)
      }
    })
  } finally {
    await servidor.fechar()
  }
}

async function testarAgendador() {
  grupo('Agendador')

  await teste('proxima execucao no horario de Manaus', async () => {
    const umHorario = [{ hora: 2, minuto: 0 }]
    // 01:00 em Manaus -> hoje as 02:00 (06:00 UTC)
    igual(proximaExecucao(new Date('2026-11-03T05:00:00Z'), umHorario).quando.toISOString(), '2026-11-03T06:00:00.000Z', 'antes do horario')
    // 03:00 em Manaus -> amanha as 02:00
    igual(proximaExecucao(new Date('2026-11-03T07:00:00Z'), umHorario).quando.toISOString(), '2026-11-04T06:00:00.000Z', 'depois do horario')
    // 23:30 em Manaus de 31/12 (ja 01/01 em UTC) -> 01/01 as 02:00
    igual(proximaExecucao(new Date('2027-01-01T03:30:00Z'), umHorario).quando.toISOString(), '2027-01-01T06:00:00.000Z', 'virada de ano')
  })

  await teste('varios horarios por dia', async () => {
    const horarios = parsearHorarios('02:00,10:00,18:00')
    const as = (iso: string) => proximaExecucao(new Date(iso), horarios)
    // 03:00 em Manaus -> 10:00 (14:00 UTC), que nao e a primeira do dia
    igual(as('2026-11-03T07:00:00Z').quando.toISOString(), '2026-11-03T14:00:00.000Z', 'manha')
    igual(as('2026-11-03T07:00:00Z').primeiraDoDia, false, '10:00 nao e a primeira')
    // exatamente 10:00 -> 18:00 (22:00 UTC)
    igual(as('2026-11-03T14:00:00Z').quando.toISOString(), '2026-11-03T22:00:00.000Z', 'no horario passa para o proximo')
    // 19:00 em Manaus -> amanha 02:00, a primeira do dia
    igual(as('2026-11-03T23:00:00Z').quando.toISOString(), '2026-11-04T06:00:00.000Z', 'noite')
    igual(as('2026-11-03T23:00:00Z').primeiraDoDia, true, '02:00 e a primeira')
  })

  await teste('historicos so aos domingos, na primeira execucao, e nunca o ano corrente repetido', async () => {
    const historicos = [2022, 2023, 2026]
    igual(exerciciosDaExecucao(new Date('2026-11-03T06:00:00Z'), historicos).join(','), '2026', 'terca')
    igual(exerciciosDaExecucao(new Date('2026-11-08T06:00:00Z'), historicos).join(','), '2022,2023,2026', 'domingo')
    igual(exerciciosDaExecucao(new Date('2026-11-08T14:00:00Z'), historicos, false).join(','), '2026', 'domingo 10:00')
    igual(anoAtualManaus(new Date('2027-01-01T03:30:00Z')), 2026, 'ano em Manaus na virada')
  })

  await teste('configuracao exibida no painel', async () => {
    const original = { ...process.env }
    try {
      process.env.FIORILLI_SYNC_ENABLED = 'true'
      process.env.FIORILLI_SYNC_HORARIO = '03:15'
      process.env.FIORILLI_SYNC_ANOS_HISTORICOS = '2024,2025'
      const config = configuracaoAgendador(new Date('2026-11-07T08:00:00Z')) // sabado 04:00 em Manaus
      igual(config.horarios.join(','), '03:15', 'horario')
      igual(config.proximaExecucao, '2026-11-08T07:15:00.000Z', 'proxima (domingo)')
      igual(config.exerciciosDaProxima.join(','), '2024,2025,2026', 'domingo inclui historicos')
      delete process.env.FIORILLI_SYNC_HORARIO
      const padrao = configuracaoAgendador(new Date('2026-11-08T07:00:00Z')) // domingo 03:00 em Manaus
      igual(padrao.horarios.join(','), '02:00,10:00,18:00', 'horarios padrao')
      igual(padrao.exerciciosDaProxima.join(','), '2026', 'domingo 10:00 sem historicos')
      process.env.FIORILLI_SYNC_ENABLED = 'false'
      igual(configuracaoAgendador().proximaExecucao, null, 'desligado')
    } finally {
      process.env = original
    }
  })

  await teste('parse das variaveis de ambiente', async () => {
    igual(JSON.stringify(parsearHorarios('03:30')), '[{"hora":3,"minuto":30}]', 'horario valido')
    igual(parsearHorarios('18:00, 10:00,25:00,10:00').map((h) => `${h.hora}:${h.minuto}`).join(','), '10:0,18:0', 'ordena, descarta invalido e repetido')
    igual(parsearHorarios('25:00').length, 3, 'nenhum valido usa o padrao')
    igual(parsearAnos('2022, 2023,abc,1999').join(','), '2022,2023', 'anos')
  })
}

async function testarIntegracao() {
  grupo('Integracao com a API real (tefe.dcsistemasweb.app.br:851)')
  const opcoes = { config: { exercicio: 2025, empresa: 1 } }

  await teste('DespesasPorOrgao (jan/2025)', async () => {
    const dados = await buscarListagem('Despesas', 'DespesasPorOrgao', {
      ...periodoDoMes(2025, 1),
      MostraDadosConsolidado: false,
    }, opcoes)
    verificar(dados.length > 0, 'nenhum orgao retornado')
    verificar(dados.every((d) => d.CODIGO && d.DESCRICAO), 'orgao sem CODIGO/DESCRICAO')
    verificar(dados.every((d) => parseMoney(d.EMPENHADO) !== null), 'EMPENHADO nao convertido')
    return `${dados.length} orgaos`
  })

  await teste('DespesasGerais (jan/2025) com parametros vazios obrigatorios', async () => {
    const dados = await buscarListagem('Despesas', 'DespesasGerais', {
      ...periodoDoMes(2025, 1),
      MostraDadosConsolidado: false,
      MostrarFornecedor: true,
      MostrarCNPJFornecedor: true,
      UFParaFiltroCOVID: '',
      ApenasIDEmpenho: false,
    }, opcoes)
    verificar(dados.length > 0, 'nenhum empenho retornado')
    const chaves = new Set(dados.map((d) => `${d.EMPRESA}-${d.PKEMP}`))
    igual(chaves.size, dados.length, 'chave (EMPRESA, PKEMP) unica')
    const datas = dados.map((d) => parseData(d.DATAE))
    verificar(datas.every((d) => d && d.getUTCFullYear() === 2025 && d.getUTCMonth() === 0), 'DATAE fora de jan/2025')
    return `${dados.length} empenhos`
  })

  await teste('Licitacoes (2025)', async () => {
    const dados = await buscarListagem('LicitacoesEContratos', 'Licitacoes', {
      Ano: 2025,
      MostraDadosConsolidado: false,
    }, opcoes)
    verificar(dados.length > 0, 'nenhuma licitacao retornada')
    // A listagem do exercicio inclui processos de anos anteriores ainda movimentados nele,
    // por isso o ano da chave tem que vir do registro (ANO), nao do parametro consultado.
    const anos = dados.map((d) => parseAno(d.ANO))
    verificar(anos.every((a) => a !== null && a <= 2025), 'ANO invalido ou posterior ao exercicio')
    const chaves = new Set(dados.map((d) => `${d.EMPRESA}-${d.ANO}-${d.NUMERO}-${d.PROCLICITACAO}`))
    igual(chaves.size, dados.length, 'chave (EMPRESA, ANO, NUMERO, PROCLICITACAO) unica')
    const comTextoDeUi = dados.filter((d) => d.CPFCNPJ && parseDocumento(d.CPFCNPJ) === null).length
    const deOutrosAnos = anos.filter((a) => a !== 2025).length
    return `${dados.length} licitacoes (${deOutrosAnos} de anos anteriores), ${comTextoDeUi} com CPFCNPJ descartado`
  })

  await teste('Contratos (2025)', async () => {
    const dados = await buscarListagem('LicitacoesEContratos', 'Contratos', {
      Ano: 2025,
      MostraDadosConsolidado: false,
      ContratosApenasPublicados: false,
    }, opcoes)
    verificar(dados.length > 0, 'nenhum contrato retornado')
    verificar(dados.every((d) => parseMoney(d.VALCON) !== null), 'VALCON nao convertido')
    return `${dados.length} contratos`
  })

  await teste('Diarias (2025): respeita o periodo pedido', async () => {
    const ano = await buscarListagem('Despesas', 'Diarias', { ...periodoDoExercicio(2025), MostraDadosConsolidado: false }, opcoes)
    const marco = await buscarListagem('Despesas', 'Diarias', { ...periodoDoMes(2025, 3), MostraDadosConsolidado: false }, opcoes)
    verificar(ano.length > marco.length, `ano ${ano.length}, marco ${marco.length}`)
    verificar(marco.every((d) => parseData(d.DATA)?.getUTCMonth() === 2), 'diaria fora de marco')
    const chaves = new Set(ano.map((d) => mapearDiaria(d, 2025)?.idExternalRef))
    igual(chaves.size, ano.length, 'chave unica')
    return `${ano.length} no ano, ${marco.length} em marco`
  })

  await teste('Transf (2025): chaves unicas', async () => {
    const dados = await buscarListagem('Transferencias', 'Transf', { MostraDadosConsolidado: false }, opcoes)
    verificar(dados.length > 0, 'nenhuma transferencia')
    igual(new Set(chavesTransferencias(dados, 2025)).size, dados.length, 'chaves')
    return `${dados.length} transferencias`
  })

  await teste('Movimentacao real do empenho 2636/2025 bate com os totais gravados', async () => {
    const movimentos = await buscarMovimentosEmpenho({ exercicio: 2025, numeroEmpenho: '2636', tipoEmpenho: 'OR', empresa: '1' })
    const liquidado = movimentos.liquidacoes.reduce((t, l) => t + l.valor, 0)
    const pago = movimentos.pagamentos.reduce((t, p) => t + p.valorPago, 0)
    igual(liquidado.toFixed(2), '609223.06', 'liquidado')
    igual(pago.toFixed(2), '300000.00', 'pago')
    return `${movimentos.liquidacoes.length} liquidacao(oes), ${movimentos.pagamentos.length} pagamento(s)`
  })

  await teste('ReceitaOrcamentaria (2025) so responde sem CodigoReceita', async () => {
    const params = { ...periodoDoMes(2025, 1), MostraDadosConsolidado: false }
    const comVazio = await buscarListagem('Receitas', 'ReceitaOrcamentaria', { ...params, CodigoReceita: '' }, opcoes)
    igual(comVazio.length, 0, 'com CodigoReceita= vazio a API devolve []')

    const dados = await buscarListagem('Receitas', 'ReceitaOrcamentaria', params, opcoes)
    verificar(dados.length > 0, 'nenhuma receita retornada')
    verificar(dados.every((d) => parseMoney(d.PREVISAO_INICIAL) !== null), 'PREVISAO_INICIAL nao convertida')
    const analiticas = dados.filter((d) => d.ORDEM === '10').length
    return `${dados.length} linhas, ${analiticas} analiticas (nivel 10)`
  })
}

async function testarBanco() {
  grupo('Banco: convivencia das fontes')
  const { Prisma } = await import('@prisma/client')
  const { prisma } = await import('../src/lib/prisma')
  const prefixo = `teste-fiorilli-${Date.now()}-`
  const ref = `${prefixo}1-2025-1-ES`

  const despesa = (fonte: string, numeroEmpenho: string) => ({
    fonte,
    idExternalRef: ref,
    exercicio: 2025,
    numeroEmpenho,
  })

  try {
    await teste('upsert pela chave (fonte, idExternalRef) e idempotente', async () => {
      const dados = {
        ...despesa('fiorilli', '1'),
        tipoEmpenho: 'ES',
        dataEmpenho: parseData('02/01/2025 00:00:00'),
        valorEmpenhado: parseMoney('113400'),
        valorAnulado: parseMoney('-25175'),
      }
      const chave = { fonte_idExternalRef: { fonte: 'fiorilli', idExternalRef: ref } }
      const criado = await prisma.despesa.upsert({ where: chave, create: dados, update: dados })
      const atualizado = await prisma.despesa.upsert({
        where: chave,
        create: dados,
        update: { ...dados, valorAnulado: -1 },
      })
      igual(atualizado.id, criado.id, 'mesmo registro')
      igual(atualizado.valorAnulado, -1, 'valorAnulado atualizado')
      igual(atualizado.dataEmpenho?.toISOString(), '2025-01-02T04:00:00.000Z', 'dataEmpenho')
      igual(await prisma.despesa.count({ where: { idExternalRef: ref } }), 1, 'registros')
    })

    await teste('mesmo idExternalRef pode existir nas duas fontes', async () => {
      await prisma.despesa.create({ data: despesa('acordar', '1') })
      igual(await prisma.despesa.count({ where: { idExternalRef: ref } }), 2, 'registros')
    })

    await teste('idExternalRef repetido na mesma fonte e rejeitado', async () => {
      try {
        await prisma.despesa.create({ data: despesa('fiorilli', '1') })
        throw new Error('deveria ter falhado')
      } catch (erro) {
        verificar(erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002', `erro inesperado: ${erro}`)
      }
    })

    await teste('remocao do webhook "acordar" nao apaga registros da Fiorilli', async () => {
      // Mesma consulta do webhook, restrita ao prefixo para nao tocar em dados reais.
      const removidos = await prisma.despesa.deleteMany({
        where: { fonte: 'acordar', idExternalRef: { notIn: ['outro'], startsWith: prefixo } },
      })
      igual(removidos.count, 1, 'removidos')
      const restantes = await prisma.despesa.findMany({ where: { idExternalRef: ref } })
      igual(restantes.length, 1, 'restantes')
      igual(restantes[0].fonte, 'fiorilli', 'fonte do restante')
    })

    await teste('registro criado sem fonte fica como "acordar"', async () => {
      const criado = await prisma.receita.create({
        data: {
          idExternalRef: `${prefixo}receita`,
          exercicio: 2025,
          codigoNatureza: '1000.00.0.0.00',
          naturezaReceita: 'RECEITAS CORRENTES.',
          categoriaEconomica: 'Receitas Correntes',
          valorPrevisto: 0,
          valorArrecadado: 0,
        },
      })
      igual(criado.fonte, 'acordar', 'fonte padrao')
    })

    await teste('SincronizacaoLog grava uma execucao', async () => {
      const log = await prisma.sincronizacaoLog.create({
        data: { fonte: 'fiorilli', modulo: 'Despesas', listagem: 'DespesasGerais', exercicio: 2025, periodo: prefixo },
      })
      const finalizado = await prisma.sincronizacaoLog.update({
        where: { id: log.id },
        data: { status: 'SUCESSO', recebidos: 470, inseridos: 470, finalizadoEm: new Date(), duracaoMs: 10 },
      })
      igual(finalizado.status, 'SUCESSO', 'status')
      igual(finalizado.inseridos, 470, 'inseridos')
    })
  } finally {
    await prisma.despesa.deleteMany({ where: { idExternalRef: { startsWith: prefixo } } })
    await prisma.receita.deleteMany({ where: { idExternalRef: { startsWith: prefixo } } })
    await prisma.sincronizacaoLog.deleteMany({ where: { periodo: prefixo } })
  }
}


async function testarSincronizacao() {
  grupo('Banco: sincronizacao contra o servidor falso (exercicio 2099)')
  const { prisma } = await import('../src/lib/prisma')
  const { sincronizarFiorilli, SincronizacaoEmAndamentoError } = await import('../src/lib/fiorilli/sync')
  const {
    getContratosPage, getDespesasPage, getDiariasPage, getLicitacoesPage, getLicitacoesStats,
    getReceitasPage, getReceitasStats, getDespesasStats, getTransferenciasPage,
  } = await import('../src/lib/site-data')
  const servidor = await servidorFalso()
  const EXERCICIO = 2099
  const chamada = { config: { baseUrl: servidor.url, maxRetries: 0, timeoutMs: 5000 }, backoffBaseMs: 1 }
  const sincronizar = (modulos: ModuloFiorilli[]) =>
    sincronizarFiorilli({ modulos, exercicios: [EXERCICIO], origem: 'CLI', chamada })

  const gerais = [
    empenho({ PKEMP: '1', CODIGO: '1', NOMEFOR: 'ALFA LTDA', EMPENHADO: '1000', LIQUIDADO: '800', PAGO: '500' }),
    empenho({ PKEMP: '2', CODIGO: '2', CODLO: '020301', NOMEFOR: 'BETA SA', CPFFORMATADO: '11.111.111/0001-11', EMPENHADO: '3000', LIQUIDADO: '3000', PAGO: '3000' }),
    empenho({ PKEMP: '3', CODIGO: '1', TPEM: 'AN', NOMEFOR: 'ALFA LTDA', EMPENHADO: '-200', LIQUIDADO: '0', PAGO: '0' }),
  ]
  const porOrgao = [totalOrgao('0202', 'ADMINISTRAÇÃO', '800', '800', '500'), totalOrgao('0203', 'EDUCAÇÃO', '3000', '3000', '3000')]

  const REF_PREFEITURA = 'teste-fiorilli-prefeitura-'
  const limpar = async () => {
    await prisma.despesa.deleteMany({ where: { exercicio: EXERCICIO, fonte: 'fiorilli' } })
    await prisma.receita.deleteMany({ where: { exercicio: EXERCICIO, fonte: 'fiorilli' } })
    await prisma.despesa.deleteMany({ where: { idExternalRef: { startsWith: REF_PREFEITURA } } })
    await prisma.receita.deleteMany({ where: { idExternalRef: { startsWith: REF_PREFEITURA } } })
    await prisma.contrato.deleteMany({ where: { ano: { in: [EXERCICIO, EXERCICIO - 1] }, OR: [{ fonte: 'fiorilli' }, { idExternalRef: { startsWith: REF_PREFEITURA } }] } })
    await prisma.licitacao.deleteMany({ where: { ano: { in: [EXERCICIO, EXERCICIO - 1] }, OR: [{ fonte: 'fiorilli' }, { idExternalRef: { startsWith: REF_PREFEITURA } }] } })
    await prisma.diaria.deleteMany({ where: { exercicio: EXERCICIO } })
    await prisma.transferencia.deleteMany({ where: { exercicio: EXERCICIO } })
    await prisma.sincronizacaoLog.deleteMany({ where: { exercicio: EXERCICIO } })
  }

  const prefeitura = (exercicio: number) => ({
    fonte: 'acordar', idExternalRef: `${REF_PREFEITURA}${exercicio}`, exercicio, numeroEmpenho: 'P1', valorEmpenhado: 7,
  })
  const receitaPrefeitura = (exercicio: number) => ({
    fonte: 'acordar', idExternalRef: `${REF_PREFEITURA}${exercicio}`, exercicio, codigoNatureza: 'P1',
    naturezaReceita: 'RECEITA DA PREFEITURA', categoriaEconomica: 'Receitas Correntes', valorPrevisto: 7, valorArrecadado: 7,
  })

  try {
    await limpar()

    await teste('sem Fiorilli no exercicio, os dados da Prefeitura aparecem', async () => {
      await prisma.despesa.createMany({ data: [prefeitura(EXERCICIO), prefeitura(EXERCICIO - 1)] })
      await prisma.receita.createMany({ data: [receitaPrefeitura(EXERCICIO), receitaPrefeitura(EXERCICIO - 1)] })
      igual((await getDespesasStats(EXERCICIO)).empenhado, 7, 'despesas 2099')
      igual((await getReceitasStats(EXERCICIO)).previsto, 7, 'receitas 2099')
    })

    await teste('primeira carga de despesas insere tudo e confere com os totais', async () => {
      prepararRoteiro(servidor, [])
      servidor.rotas = { DespesasPorOrgao: porOrgao, DespesasGerais: gerais }
      const [r] = await sincronizar(['despesas'])
      igual(r.status, 'SUCESSO', `status (${r.erro ?? r.divergencias?.join('; ')})`)
      igual(r.inseridos, 3, 'inseridos')
      const log = await prisma.sincronizacaoLog.findUnique({ where: { id: r.logId } })
      igual(log?.status, 'SUCESSO', 'status no log')
      igual(log?.inseridos, 3, 'inseridos no log')
      const gerais2099 = servidor.chamadas.find((c) => c.includes('Listagem=DespesasGerais'))!
      verificar(gerais2099.includes('ConectarExercicio=2099') && gerais2099.includes('UFParaFiltroCOVID=&'), gerais2099)
    })

    await teste('com Fiorilli no exercicio, os dados da Prefeitura dele saem das consultas', async () => {
      igual((await getDespesasStats(EXERCICIO)).empenhado, 3800, 'so Fiorilli em 2099')
      const lista = await getDespesasPage({ exercicio: EXERCICIO })
      verificar(lista.data.every((d) => d.fonte === 'fiorilli'), 'registro da Prefeitura na lista de 2099')
      igual((await getDespesasStats(EXERCICIO - 1)).empenhado, 7, 'Prefeitura continua em 2098')
      igual(await prisma.despesa.count({ where: { idExternalRef: { startsWith: REF_PREFEITURA } } }), 2, 'nada foi apagado')
    })

    await teste('segunda carga atualiza e remove o que sumiu da API', async () => {
      servidor.rotas = {
        DespesasPorOrgao: [totalOrgao('0202', 'ADMINISTRAÇÃO', '1000', '900', '900')],
        DespesasGerais: [empenho({ PKEMP: '1', CODIGO: '1', NOMEFOR: 'ALFA LTDA', EMPENHADO: '1000', LIQUIDADO: '900', PAGO: '900' })],
      }
      const [r] = await sincronizar(['despesas'])
      igual(r.status, 'SUCESSO', 'status')
      igual(r.atualizados, 1, 'atualizados')
      igual(r.removidos, 2, 'removidos')
      const pago = await prisma.despesa.findFirst({ where: { exercicio: EXERCICIO, fonte: 'fiorilli' } })
      igual(pago?.valorPago, 900, 'valor atualizado')
    })

    await teste('totais diferentes do oficial marcam DIVERGENTE (e gravam mesmo assim)', async () => {
      servidor.rotas = { DespesasPorOrgao: [totalOrgao('0202', 'ADMINISTRAÇÃO', '1', '1', '1'), porOrgao[1]], DespesasGerais: gerais }
      const [r] = await sincronizar(['despesas'])
      igual(r.status, 'DIVERGENTE', 'status')
      igual(r.inseridos, 2, 'inseridos')
      const log = await prisma.sincronizacaoLog.findUnique({ where: { id: r.logId } })
      verificar(log?.mensagemErro?.includes('orgao 0202'), `mensagem: ${log?.mensagemErro}`)
    })

    await teste('lista vazia da API nao apaga o exercicio', async () => {
      servidor.rotas = { DespesasPorOrgao: [], DespesasGerais: [] }
      const [r] = await sincronizar(['despesas'])
      igual(r.removidos, 0, 'removidos')
      verificar(r.aviso, 'sem aviso')
      igual(await prisma.despesa.count({ where: { exercicio: EXERCICIO, fonte: 'fiorilli' } }), 3, 'registros mantidos')
    })

    await teste('erro da API vira status ERRO no log, sem apagar nada', async () => {
      servidor.rotas = {}
      prepararRoteiro(servidor, [{ status: 500, corpo: 'erro' }])
      const [r] = await sincronizar(['despesas'])
      igual(r.status, 'ERRO', 'status')
      igual(await prisma.despesa.count({ where: { exercicio: EXERCICIO, fonte: 'fiorilli' } }), 3, 'registros mantidos')
    })

    await teste('duas sincronizacoes ao mesmo tempo: a segunda e recusada', async () => {
      prepararRoteiro(servidor, [{ status: 200, corpo: '[]', atrasoMs: 300 }])
      const primeira = sincronizar(['despesas'])
      try {
        await sincronizar(['despesas'])
        throw new Error('deveria ter sido recusada')
      } catch (erro) {
        verificar(erro instanceof SincronizacaoEmAndamentoError, `erro inesperado: ${erro}`)
      } finally {
        await primeira
      }
    })

    await teste('filtros e ordenacao de despesas', async () => {
      servidor.rotas = { DespesasPorOrgao: porOrgao, DespesasGerais: gerais }
      prepararRoteiro(servidor, [])
      servidor.rotas = { DespesasPorOrgao: porOrgao, DespesasGerais: gerais }
      await sincronizar(['despesas'])
      const porOrgaoNome = await getDespesasPage({ exercicio: EXERCICIO, orgao: 'EDUCAÇÃO' })
      igual(porOrgaoNome.pagination.total, 1, 'filtro por orgao')
      const porCnpj = await getDespesasPage({ exercicio: EXERCICIO, credor: '11.111.111' })
      igual(porCnpj.data[0]?.credorNome, 'BETA SA', 'filtro por CNPJ do credor')
      const combinado = await getDespesasPage({ exercicio: EXERCICIO, credor: 'ALFA', search: 'ASSESSORIA' })
      igual(combinado.pagination.total, 2, 'credor + busca')
      const ordenado = await getDespesasPage({ exercicio: EXERCICIO, ordenar: 'valorEmpenhado', ordem: 'asc' })
      igual(ordenado.data.map((d) => d.valorEmpenhado).join(','), '-200,1000,3000', 'ordenacao')
      const ignorado = await getDespesasPage({ exercicio: EXERCICIO, ordenar: 'payload' })
      igual(ignorado.pagination.total, 3, 'campo de ordenacao invalido e ignorado')
      const stats = await getDespesasStats(EXERCICIO)
      igual(stats.empenhado, 3800, 'total empenhado com anulacao')
    })

    await teste('receitas: grava a arvore e as somas usam so as analiticas', async () => {
      prepararRoteiro(servidor, [])
      servidor.rotas = {
        ReceitaOrcamentaria: [
          receita('1', '1000.00.0.0.00', '300', '120'),
          receita('7', '1112.00.0.0.00', '300', '120'),
          receita('10', '1112.00.0.0.01', '100', '20', { EMPRESA: '1', FONTE: '1.500.0000 ' }),
          receita('10', '1712.00.0.0.01', '200', '100', { EMPRESA: '1', FONTE: '1.540.0000 ' }),
        ],
        ReceitaUniao: [receita('3', '1710.00.0.0.00', '200', '100'), receita('7', '1712.00.0.0.00', '200', '100')],
        ReceitaEstado: [],
      }
      const [r] = await sincronizar(['receitas'])
      igual(r.status, 'SUCESSO', `status (${r.erro ?? r.divergencias?.join('; ')})`)
      igual(r.inseridos, 6, 'inseridos')
      const stats = await getReceitasStats(EXERCICIO)
      igual(stats.previsto, 300, 'previsto sem duplicidade nem a receita da Prefeitura')
      igual((await getReceitasStats(EXERCICIO - 1)).previsto, 7, 'Prefeitura continua em 2098')
      igual(stats.arrecadado, 120, 'arrecadado sem duplicidade')
      const lista = await getReceitasPage({ exercicio: EXERCICIO })
      igual(lista.pagination.total, 2, 'lista padrao so com analiticas')
      const uniao = await getReceitasPage({ exercicio: EXERCICIO, tipo: 'uniao', ordenar: 'codigoNatureza', ordem: 'asc' })
      // Uniao tambem vem em arvore: so as linhas mais detalhadas (nivel 7), sem repetir o total do nivel 3.
      igual(uniao.data.map((d) => d.codigoNatureza).join(','), '1712.00.0.0.00', 'tipo uniao')
      igual((await getReceitasStats(EXERCICIO, 'uniao')).previsto, 200, 'total da Uniao sem duplicidade')
      const chamadaReceita = servidor.chamadas.find((c) => c.includes('Listagem=ReceitaOrcamentaria'))!
      verificar(!chamadaReceita.includes('CodigoReceita'), `CodigoReceita enviado: ${chamadaReceita}`)
    })

    await teste('licitacoes e contratos: contrato ligado ao processo, sem remover o que sumiu', async () => {
      await prisma.licitacao.create({
        data: { fonte: 'acordar', idExternalRef: `${REF_PREFEITURA}lic`, numero: 'P1', ano: EXERCICIO, modalidade: 'X', objeto: 'DA PREFEITURA' },
      })
      igual((await getLicitacoesStats(EXERCICIO)).total, 1, 'antes da Fiorilli, a da Prefeitura aparece')

      prepararRoteiro(servidor, [])
      servidor.rotas = {
        Licitacoes: [licitacao({}), licitacao({ NUMERO: '000183', PROCLICITACAO: '183', PROCLIC: '000183/99', SITUACAO: 'Homologada' })],
        Contratos: [contrato({}), contrato({ CODIGO: '0060/99', PROCLIC: '000999/99', FORNECEDOR: 'OUTRA LTDA', INSMF: '11.111.111/0001-11' })],
      }
      const resultados = await sincronizar(['contratos', 'licitacoes'])
      igual(resultados.map((r) => r.modulo).join(','), 'licitacoes,contratos', 'licitacoes rodam antes')
      igual(resultados.map((r) => r.status).join(','), 'SUCESSO,SUCESSO', 'status')

      const ligado = await prisma.contrato.findFirst({ where: { fonte: 'fiorilli', ano: EXERCICIO, numero: '173/2099' }, include: { licitacao: true } })
      igual(ligado?.licitacao?.numeroProcesso, '000182/99', 'contrato ligado a licitacao')

      const licitacoes = await getLicitacoesPage({ ano: EXERCICIO, ordenar: 'numero', ordem: 'asc' })
      igual(licitacoes.data.map((l) => l.numero).join(','), '000182,000183', 'so Fiorilli em 2099, ordenado')
      const porFornecedor = await getContratosPage({ ano: EXERCICIO, fornecedor: '11.111.111' })
      igual(porFornecedor.data[0]?.contratadoNome, 'OUTRA LTDA', 'filtro por CNPJ do fornecedor')

      servidor.rotas = { Licitacoes: [licitacao({})], Contratos: [contrato({})] }
      const [lic, con] = await sincronizar(['licitacoes', 'contratos'])
      igual((lic.removidos ?? 0) + (con.removidos ?? 0), 0, 'nada removido')
      igual(await prisma.licitacao.count({ where: { fonte: 'fiorilli', ano: EXERCICIO } }), 2, 'licitacao ausente continua')
    })

    await teste('diarias e transferencias: grava, filtra, soma e remove o que sumiu do exercicio', async () => {
      prepararRoteiro(servidor, [])
      servidor.rotas = {
        Diarias: [diaria({}), diaria({ PKEMP: '2', ORDEMPAGAMENTO: '9', FAVORECIDO: 'MARIA', CARGO: 'MOTORISTA', VALOR: '600', QUANT: '2' })],
        Transf: [transferencia({}), transferencia({}), transferencia({ MES: '2', DTLAN: '10/02/2099 00:00:00', REPASSE: '100' })],
      }
      const [d, t] = await sincronizar(['diarias', 'transferencias'])
      igual(`${d.inseridos}/${t.inseridos}`, '2/3', 'inseridos')

      const diarias = await getDiariasPage({ exercicio: EXERCICIO, favorecido: 'MOTORISTA' })
      igual(diarias.data[0]?.favorecido, 'MARIA', 'filtro por cargo')
      igual((await getDiariasPage({ exercicio: EXERCICIO })).totais.valor, 2000, 'soma das diarias')
      verificar(!('payload' in diarias.data[0]), 'payload na resposta')

      const fevereiro = await getTransferenciasPage({ exercicio: EXERCICIO, mes: 2 })
      igual(fevereiro.totais.repasse, 100, 'filtro por mes')

      servidor.rotas = { Diarias: [diaria({})], Transf: [transferencia({})] }
      const [d2, t2] = await sincronizar(['diarias', 'transferencias'])
      igual(`${d2.removidos}/${t2.removidos}`, '1/2', 'removidos')
    })

    await teste('exportacao usa os mesmos filtros e a prioridade da Fiorilli', async () => {
      const { CONJUNTOS } = await import('../src/lib/exportacao/conjuntos')
      const diarias = await CONJUNTOS.diarias.buscar({ ano: EXERCICIO })
      igual(diarias.length, 1, 'diarias do exercicio')
      const licitacoes = (await CONJUNTOS.licitacoes.buscar({ ano: EXERCICIO })) as Array<{ fonte: string }>
      verificar(licitacoes.length > 0 && licitacoes.every((l) => l.fonte === 'fiorilli'), 'licitacao da Prefeitura exportada num ano com Fiorilli')
      const filtradas = await CONJUNTOS.contratos.buscar({ ano: EXERCICIO, fornecedor: 'COMAZI' })
      igual(filtradas.length, 1, 'filtro de fornecedor')
    })

    await teste('receitas sem a orcamentaria nao gravam nada', async () => {
      servidor.rotas = { ReceitaOrcamentaria: [], ReceitaUniao: [receita('3', '1710.00.0.0.00', '1', '1')], ReceitaEstado: [] }
      const [r] = await sincronizar(['receitas'])
      verificar(r.aviso, 'sem aviso')
      igual(await prisma.receita.count({ where: { exercicio: EXERCICIO, fonte: 'fiorilli' } }), 6, 'registros mantidos')
    })
  } finally {
    await limpar()
    await servidor.fechar()
    await prisma.$disconnect()
  }
}

async function main() {
  await testarParsers()
  await testarMontagem()
  await testarCliente()
  await testarMapeamento()
  await testarMapeamentoCompras()
  await testarExportacao()
  await testarMovimentosEmpenho()
  await testarAgendador()
  if (INTEGRACAO) await testarIntegracao()
  if (BANCO) {
    await testarBanco()
    await testarSincronizacao()
  }
  process.exit(resumo())
}

main().catch((erro) => {
  console.error(erro)
  process.exit(1)
})
