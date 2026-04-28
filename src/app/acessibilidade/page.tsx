import type { Metadata } from "next"
import { Accessibility, Eye, Monitor, Smartphone, ZoomIn } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Acessibilidade",
  description: "Recursos e compromisso de acessibilidade digital do Portal da Transparência de Tefé.",
  alternates: {
    canonical: "/acessibilidade",
  },
}

export default function Acessibilidade() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Accessibility className="h-8 w-8 text-emerald-800" />
          Acessibilidade
        </h1>
        <p className="text-slate-600 mt-2">
          Este portal foi desenvolvido seguindo as diretrizes de acessibilidade web.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-800" />
              Compromisso com a Acessibilidade
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600 space-y-2">
            <p>
              Este portal é dedicado a garantir acessibilidade digital para todas as pessoas, 
              incluindo aquelas com deficiência. Buscamos conformance com as diretrizes 
              WCAG 2.1 (Web Content Accessibility Guidelines) no nível AA.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-emerald-800" />
              Recursos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600 space-y-3">
            <ul className="list-disc list-inside space-y-2">
              <li>Navegação por teclado em todas as funcionalidades</li>
              <li>Contraste suficiente entre cores</li>
              <li>Textos alternativos em imagens</li>
              <li>Hierarquia clara de títulos e estrutura semântica</li>
              <li>Formulários com rótulos e mensagens de erro claras</li>
              <li>Links com descrições significativas</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-800" />
              Design Responsivo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            <p>
              O portal é totalmente responsivo e se adapta a diferentes tamanhos de tela, 
              incluindo smartphones e tablets, permitindo que todos os usuários acessem 
              o conteúdo de forma adequada em qualquer dispositivo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ZoomIn className="h-5 w-5 text-emerald-800" />
              Ajuste de Tamanho de Fonte
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            <p>
              Você pode aumentar ou diminuir o tamanho das fontes usando os comandos 
              do seu navegador:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Windows/Linux:</strong> Ctrl + + ou Ctrl + -</li>
              <li><strong>Mac:</strong> Cmd + + ou Cmd + -</li>
              <li><strong>Zoom:</strong> Ctrl + 0 (zoom)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback e Contato</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            <p>
              Se você encontrar alguma barreira de acessibilidade ou tiver sugestões 
              de melhoria, entre em contato conosco através do e-SIC ou pelo email 
              disponível no rodapé do site.
            </p>
          </CardContent>
        </Card>

        <p className="text-sm text-slate-600 text-center">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  )
}
