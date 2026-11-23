import { notFound } from "next/navigation"
import { BadgeDollarSign, CalendarDays, CircleGauge, Database, Layers3, TrendingUp, WalletCards } from "lucide-react"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { Campo, Campos, ListaAnexos, Voltar, formatarMoeda } from "@/components/portal/detalhe"
import { StructuredData } from "@/components/portal/structured-data"
import { Card, CardContent } from "@/components/ui/card"
import { getReceitaDetalhe } from "@/lib/site-data"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

type Receita = NonNullable<Awaited<ReturnType<typeof getReceitaDetalhe>>>

function percentual(receita: Receita) {
  return receita.valorPrevisto > 0 ? (receita.valorArrecadado / receita.valorPrevisto) * 100 : 0
}

export async function generateMetadata({ params }: PageProps) {
  const receita = await getReceitaDetalhe((await params).id)
  if (!receita) return { title: "Receita não encontrada | Portal da Transparência" }
  return {
    title: `${receita.naturezaReceita} | Receitas Públicas`,
    description: `Receita ${receita.codigoNatureza} de ${receita.exercicio}: ${formatarMoeda(receita.valorArrecadado)} arrecadados.`,
  }
}

export default async function ReceitaDetalhe({ params }: PageProps) {
  const receita = await getReceitaDetalhe((await params).id)
  if (!receita) notFound()

  const realizacao = percentual(receita)
  const previsaoAtualizada = receita.valorPrevistoAtualizado ?? receita.valorPrevisto

  return (
    <div className="portal-detail container mx-auto px-4 py-6">
      <StructuredData type="webpage" data={{
        title: receita.naturezaReceita,
        description: `Detalhes da receita pública ${receita.codigoNatureza} do exercício de ${receita.exercicio}.`,
        url: `/receitas/${receita.id}`,
        breadcrumbs: [{ name: "Home", url: "/" }, { name: "Receitas", url: "/receitas" }, { name: receita.codigoNatureza, url: `/receitas/${receita.id}` }],
      }} />

      <Breadcrumbs items={[{ label: "Transparência", href: "/" }, { label: "Receitas", href: "/receitas" }, { label: receita.codigoNatureza }]} />
      <Voltar href={`/receitas?ano=${receita.exercicio}`}>Voltar para as receitas de {receita.exercicio}</Voltar>

      <section className="portal-detail-hero relative mb-4 overflow-hidden rounded-xl bg-institutional p-5 text-white shadow-[0_10px_28px_rgba(18,52,91,0.16)]">
        <span className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amazon/25" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white/85">{receita.codigoNatureza}</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">Receita pública</span>
            </div>
            <h1 className="max-w-4xl text-xl font-extrabold leading-tight sm:text-2xl">{receita.naturezaReceita}</h1>
            <p className="mt-2 flex items-center gap-2 text-xs text-white/65"><CalendarDays className="h-3.5 w-3.5" /> Exercício de {receita.exercicio}</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amazon text-white shadow-lg"><TrendingUp className="h-7 w-7" /></div>
        </div>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 shadow-sm"><CardContent className="flex items-center justify-between p-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-digital">Previsão inicial</p><p className="mt-0.5 text-base font-extrabold text-institutional">{formatarMoeda(receita.valorPrevisto)}</p></div><BadgeDollarSign className="h-5 w-5 text-digital" /></CardContent></Card>
        <Card className="border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 shadow-sm"><CardContent className="flex items-center justify-between p-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-amazon">Arrecadado</p><p className="mt-0.5 text-base font-extrabold text-amazon">{formatarMoeda(receita.valorArrecadado)}</p></div><TrendingUp className="h-5 w-5 text-amazon" /></CardContent></Card>
        <Card className="border border-amber-100 bg-gradient-to-br from-white to-amber-50/70 shadow-sm"><CardContent className="p-3"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Realização</p><p className="mt-0.5 text-base font-extrabold text-amber-700">{receita.valorPrevisto > 0 ? `${realizacao.toFixed(1)}%` : "Sem previsão"}</p></div><CircleGauge className="h-5 w-5 text-amber-700" /></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-amber-100"><div className={`h-full rounded-full ${realizacao > 100 ? "bg-amazon" : "bg-gold"}`} style={{ width: `${Math.min(realizacao, 100)}%` }} /></div></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="overflow-hidden border border-border-subtle shadow-[0_8px_24px_rgba(18,52,91,0.07)]">
          <div className="border-b border-border-subtle bg-slate-50 px-4 py-2.5"><h2 className="flex items-center gap-2 text-sm font-bold text-institutional"><Layers3 className="h-4 w-4 text-digital" />Classificação da receita</h2></div>
          <CardContent className="p-4">
            <Campos>
              <Campo rotulo="Código da natureza" valor={receita.codigoNatureza} />
              <Campo rotulo="Categoria econômica" valor={receita.categoriaEconomica} />
              <Campo rotulo="Tipo de receita" valor={receita.tipoReceita} />
              <Campo rotulo="Fonte do recurso" valor={[receita.fonteRecurso, receita.fonteRecursoNome].filter(Boolean).join(" - ")} />
              <Campo rotulo="Mês de referência" valor={receita.mes ? receita.mes.toString().padStart(2, "0") : null} />
              <Campo rotulo="Nível contábil" valor={receita.nivel} />
            </Campos>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-emerald-100 shadow-[0_8px_24px_rgba(22,132,93,0.08)]">
          <div className="border-b border-emerald-100 bg-emerald-50/60 px-4 py-2.5"><h2 className="flex items-center gap-2 text-sm font-bold text-institutional"><WalletCards className="h-4 w-4 text-amazon" />Valores complementares</h2></div>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-1">
            <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Previsão atualizada</p><p className="mt-1 text-lg font-bold text-institutional">{formatarMoeda(previsaoAtualizada)}</p></div>
            {receita.valorArrecadadoPeriodo !== null && <div className="border-t border-slate-100 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Arrecadado no período</p><p className="mt-1 text-lg font-bold text-amazon">{formatarMoeda(receita.valorArrecadadoPeriodo)}</p></div>}
            <div className="border-t border-slate-100 pt-4"><p className="flex items-center gap-1.5 text-xs text-slate-500"><Database className="h-3.5 w-3.5" />Origem do registro</p><p className="mt-1 text-sm font-semibold capitalize text-text-primary">{receita.fonte}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6"><ListaAnexos anexos={receita.anexos} /></div>
    </div>
  )
}
