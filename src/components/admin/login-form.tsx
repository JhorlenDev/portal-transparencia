'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const retorno = params.get('retorno') || '/admin/backup'

  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)

    try {
      const resposta = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      })

      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => ({}))) as { error?: string }
        setErro(corpo.error ?? 'Não foi possível entrar.')
        return
      }

      router.replace(retorno.startsWith('/admin') ? retorno : '/admin/backup')
      router.refresh()
    } catch {
      setErro('Falha de rede ao tentar entrar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Área administrativa</CardTitle>
        <CardDescription>Informe a senha do administrador para acessar o sistema de backup.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={entrar} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="senha" className="text-sm font-medium text-slate-700">
              Senha
            </label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoFocus
            />
          </div>

          {erro && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={enviando || senha.length === 0}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
