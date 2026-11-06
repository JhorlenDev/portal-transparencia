import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Paperclip, SearchX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

/** Blocos das paginas de detalhe (despesa, licitacao, contrato, diaria). */

export function formatarMoeda(valor: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(valor ?? 0)
}

/** Datas do portal sao gravadas no fuso de Manaus. */
export function formatarData(data: Date | null | undefined): string {
  return data ? data.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' }) : '-'
}

export function Voltar({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline">
      <ArrowLeft className="h-4 w-4" aria-hidden /> {children}
    </Link>
  )
}

/** Par rotulo/valor; nao renderiza nada quando o valor esta vazio. */
export function Campo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  if (valor === null || valor === undefined || valor === '') return null
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{valor}</dd>
    </div>
  )
}

export function CartaoValor({ rotulo, valor, cor, detalhe }: { rotulo: string; valor: number | null | undefined; cor: string; detalhe?: string }) {
  return (
    <Card className={`border-l-4 ${cor}`}>
      <CardContent className="p-5">
        <p className="text-sm text-slate-600">{rotulo}</p>
        <p className={`text-2xl font-bold ${(valor ?? 0) < 0 ? 'text-red-700' : 'text-slate-800'}`}>{formatarMoeda(valor)}</p>
        {detalhe && <p className="text-xs text-slate-500">{detalhe}</p>}
      </CardContent>
    </Card>
  )
}

export function Secao({ titulo, icone, children, className = "mb-6" }: { titulo: string; icone?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={`min-w-0 ${className}`}>
      <CardContent className="p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          {icone} {titulo}
        </h2>
        {children}
      </CardContent>
    </Card>
  )
}

/** Grade de Campos. */
export function Campos({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
}

export function TextoLongo({ rotulo, texto }: { rotulo: string; texto: string | null | undefined }) {
  if (!texto) return null
  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{texto}</p>
    </div>
  )
}

interface Anexo {
  id: string
  nomeArquivo: string
}

export function ListaAnexos({ anexos }: { anexos: Anexo[] }) {
  if (anexos.length === 0) return null
  return (
    <Secao titulo="Anexos" icone={<Paperclip className="h-5 w-5 text-slate-600" aria-hidden />}>
      <ul className="divide-y divide-slate-100">
        {anexos.map((anexo) => (
          <li key={anexo.id} className="flex items-center justify-between gap-3 py-2">
            <span className="truncate text-sm text-slate-700">{anexo.nomeArquivo}</span>
            <a href={`/api/anexos/${anexo.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm font-medium text-blue-700 hover:underline">
              Abrir
            </a>
          </li>
        ))}
      </ul>
    </Secao>
  )
}

export interface EmpenhoResumo {
  id: string
  numeroEmpenho: string
  exercicio: number
  dataEmpenho: Date | null
  tipoMovimento: string
  credorNome: string | null
  valorEmpenhado: number | null
  valorPago: number | null
}

/** Empenhos ligados a um processo licitatorio, com link para o detalhe de cada um. */
export function TabelaEmpenhos({ empenhos }: { empenhos: EmpenhoResumo[] }) {
  const empenhado = empenhos.reduce((t, e) => t + (e.valorEmpenhado ?? 0), 0)
  const pago = empenhos.reduce((t, e) => t + (e.valorPago ?? 0), 0)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-3">Empenho</th>
            <th className="py-2 pr-3">Credor</th>
            <th className="py-2 pr-3 text-right">Empenhado</th>
            <th className="py-2 text-right">Pago</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {empenhos.map((e) => (
            <tr key={e.id} className="align-top">
              <td className="py-2 pr-3 whitespace-nowrap">
                <Link href={`/despesas/${e.id}`} className="font-medium text-emerald-800 hover:underline">{e.numeroEmpenho}/{e.exercicio}</Link>
                <p className="text-xs text-slate-500">
                  {formatarData(e.dataEmpenho)}{e.tipoMovimento === 'Anulação' && ' · anulação'}
                </p>
              </td>
              <td className="py-2 pr-3 min-w-[12rem]">{e.credorNome ?? '-'}</td>
              <td className={`py-2 pr-3 text-right whitespace-nowrap ${(e.valorEmpenhado ?? 0) < 0 ? 'text-red-700' : ''}`}>{formatarMoeda(e.valorEmpenhado)}</td>
              <td className="py-2 text-right font-medium text-emerald-800 whitespace-nowrap">{formatarMoeda(e.valorPago)}</td>
            </tr>
          ))}
        </tbody>
        {empenhos.length > 1 && (
          <tfoot>
            <tr className="border-t border-slate-200 font-semibold">
              <td className="py-2 pr-3" colSpan={2}>Total</td>
              <td className="py-2 pr-3 text-right whitespace-nowrap">{formatarMoeda(empenhado)}</td>
              <td className="py-2 text-right whitespace-nowrap text-emerald-800">{formatarMoeda(pago)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

/** Conteudo do not-found.tsx de cada detalhe. */
export function NaoEncontrado({ titulo, href, rotulo }: { titulo: string; href: string; rotulo: string }) {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <SearchX className="mx-auto mb-4 h-12 w-12 text-slate-400" aria-hidden />
      <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
      <p className="mt-2 text-slate-600">O endereço pode estar incorreto ou o registro foi removido do sistema de origem.</p>
      <Link href={href} className="mt-6 inline-block font-medium text-emerald-700 hover:underline">
        {rotulo}
      </Link>
    </div>
  )
}
