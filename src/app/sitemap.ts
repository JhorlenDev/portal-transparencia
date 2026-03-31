import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal-transparencia-360.vercel.app'

  const routes = [
    '',
    '/despesas',
    '/receitas',
    '/licitacoes',
    '/contratos',
    '/servidores',
    '/convenios',
    '/esic',
    '/dados-abertos',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }))
}
