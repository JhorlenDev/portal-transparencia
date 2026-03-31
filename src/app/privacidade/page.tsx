import { Shield, Lock, Eye, Mail } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = 'force-dynamic'

export default function Privacidade() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Shield className="h-8 w-8 text-emerald-700" />
          Política de Privacidade
        </h1>
        <p className="text-slate-600 mt-2">
          Esta política de privacidade descreve como coletamos, usamos e protegemos suas informações.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-700" />
              Coleta de Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600 space-y-2">
            <p>
              Este portal de transparência pública coleta apenas informações necessárias para cumprir 
              com as obrigações legais de transparência pública, em conformidade com a Lei de Acesso 
              à Informação (Lei nº 12.527/2011).
            </p>
            <p>
              <strong>Dados coletados automaticamente:</strong> Endereço IP, navegador, 
              páginas acessadas, data e horário de acesso. Estes dados são utilizados apenas 
              para fins estatísticos e de segurança.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-700" />
              Proteção de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600 space-y-2">
            <p>
              Implementamos medidas de segurança adequadas para proteger suas informações contra 
              acesso não autorizado, alteração, divulgação ou destruição.
            </p>
            <p>
              Os dados pessoais fornecidos pelos cidadãos através de pedidos de informação 
              (e-SIC) são tratados conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-emerald-700" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            <p>
              Para dúvidas sobre esta política de privacidade, entre em contato conosco através 
              do e-SIC ou pelo email de contato disponível no rodapé do site.
            </p>
          </CardContent>
        </Card>

        <p className="text-sm text-slate-500 text-center">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  )
}
