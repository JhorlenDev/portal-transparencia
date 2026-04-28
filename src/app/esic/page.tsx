import type { Metadata } from "next"
import { MessageSquare, FileText, Clock, HelpCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "e-SIC e Lei de Acesso à Informação",
  description: "Solicite e acompanhe pedidos de informação pública à Prefeitura Municipal de Tefé pelo Serviço de Informação ao Cidadão.",
  alternates: {
    canonical: "/esic",
  },
}

export default function ESIC() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-teal-600" />
          Serviço de Informação ao Cidadão (e-SIC)
        </h1>
        <p className="text-slate-600 mt-2 max-w-3xl">
          A Lei de Acesso à Informação (Lei nº 12.527/2011) garante a qualquer pessoa o direito de receber informações públicas.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                Novo Pedido de Informação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome Completo *</label>
                    <Input placeholder="Seu nome completo" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">E-mail *</label>
                    <Input type="email" placeholder="seu@email.com" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assunto *</label>
                  <Input placeholder="Resumo do que deseja saber" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição do Pedido *</label>
                  <textarea 
                    className="w-full min-h-32 p-3 border border-slate-300 rounded-md" 
                    placeholder="Descreva detalhadamente a informação que você deseja obter..."
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 gap-2">
                  Enviar Pedido
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-teal-600" />
                Acompanhar Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input placeholder="Digite o número do protocolo" className="flex-1" />
                <Button variant="outline">Consultar</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-teal-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-teal-900">Prazo de Resposta</h4>
                  <p className="text-sm text-teal-700 mt-1">
                    O órgão público tem até <strong>20 dias</strong> para responder, podendo ser prorrogado por mais 10 dias.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Perguntas Frequentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">O que é a LAI?</p>
                <p className="text-slate-600">Lei de Acesso à Informação (Lei 12.527/2011).</p>
              </div>
              <div>
                <p className="font-medium">Quem pode fazer pedidos?</p>
                <p className="text-slate-600">Qualquer pessoa, física ou jurídica.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-5">
              <h4 className="font-semibold text-blue-900 mb-2">Plataforma Fala.BR</h4>
              <p className="text-sm text-blue-700 mb-4">
                Você também pode registrar pelo sistema federal Fala.BR.
              </p>
              <Button variant="outline" className="w-full gap-2 border-blue-300 text-blue-700 hover:bg-blue-100">
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
