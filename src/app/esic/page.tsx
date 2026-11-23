import type { Metadata } from "next"
import { MessageSquare, FileText, Clock, HelpCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { CompactPageTitle } from "@/components/portal/compact-page-title"

export const metadata: Metadata = {
  title: "e-SIC e Lei de Acesso à Informação",
  description: "Solicite e acompanhe pedidos de informação pública à Prefeitura Municipal de Tefé pelo Serviço de Informação ao Cidadão.",
  alternates: {
    canonical: "/esic",
  },
}

export default function ESIC() {
  return (
    <div className="portal-page portal-page--esic container mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Transparência", href: "/" }, { label: "e-SIC" }]} />
      <div className="mb-4 rounded-xl border border-blue-100 bg-white p-3 shadow-[0_4px_14px_rgba(18,52,91,0.06)]">
        <CompactPageTitle icon={<MessageSquare className="h-5 w-5" />} title="Acesso à Informação (e-SIC)" description="Solicite e acompanhe informações públicas" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border border-blue-100 shadow-[0_6px_20px_rgba(18,52,91,0.07)]">
            <div className="h-1 bg-digital" aria-hidden="true" />
            <CardHeader className="border-b border-blue-100 bg-blue-50/45 p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-digital" />
                Novo Pedido de Informação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-institutional">Nome completo *</label>
                    <Input placeholder="Seu nome completo" className="h-10" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-institutional">E-mail *</label>
                    <Input type="email" placeholder="seu@email.com" className="h-10" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-institutional">Assunto *</label>
                  <Input placeholder="Resumo do que deseja saber" className="h-10" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-institutional">Descrição do pedido *</label>
                  <textarea 
                    className="min-h-24 w-full rounded-lg border border-border-subtle p-3 text-sm outline-none focus:border-digital focus:ring-2 focus:ring-digital/20"
                    placeholder="Descreva detalhadamente a informação que você deseja obter..."
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" className="gap-2 bg-digital px-5 hover:bg-institutional-hover">Enviar pedido</Button>
                </div>
                <div className="mt-4 border-t border-border-subtle pt-4">
                  <div className="mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-gold" /><h3 className="text-sm font-bold text-institutional">Acompanhar pedido</h3></div>
                  <div className="flex gap-2"><Input placeholder="Número do protocolo" className="h-10 flex-1" /><Button type="button" variant="outline" className="h-10 border-digital text-digital hover:bg-blue-50">Consultar</Button></div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card className="border-amber-200 bg-amber-50/70">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-amber-700" />
                <div>
                  <h4 className="font-semibold text-institutional">Prazo de resposta</h4>
                  <p className="mt-1 text-sm text-text-secondary">
                    O órgão público tem até <strong>20 dias</strong> para responder, podendo ser prorrogado por mais 10 dias.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100">
            <CardHeader className="border-b border-blue-100 bg-blue-50/40 p-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <HelpCircle className="h-4 w-4 text-digital" />
                Perguntas Frequentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 text-sm">
              <div className="border-b border-slate-100 pb-3">
                <p className="font-medium">O que é a LAI?</p>
                <p className="text-slate-600">Lei de Acesso à Informação (Lei 12.527/2011).</p>
              </div>
              <div>
                <p className="font-medium">Quem pode fazer pedidos?</p>
                <p className="text-slate-600">Qualquer pessoa, física ou jurídica.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-institutional text-white">
            <CardContent className="p-4">
              <h4 className="mb-1 font-semibold text-white">Plataforma Fala.BR</h4>
              <p className="mb-3 text-sm text-white/65">
                Você também pode registrar pelo sistema federal Fala.BR.
              </p>
              <Button variant="outline" className="w-full gap-2 border-white/20 bg-white text-institutional hover:bg-gold">
                <ExternalLink className="h-4 w-4" />
                Acessar Fala.BR
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
