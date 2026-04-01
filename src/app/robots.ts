import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://transparencia.tefe.am.gov.br'
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'], // Impedimos bots de gastar crawler budget nas rotas de API diretamente
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
