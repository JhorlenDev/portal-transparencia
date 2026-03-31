import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const siteConfigs = [
  { chave: 'nome_site', valor: 'Portal da Transparência', tipo: 'text', descricao: 'Nome do site', ordem: 1 },
  { chave: 'subtitulo_site', valor: 'Prefeitura Municipal', tipo: 'text', descricao: 'Subtítulo do site', ordem: 2 },
  { chave: 'descricao', valor: 'Portal de transparência pública da Prefeitura Municipal. Acesso a informações públicas conforme Lei de Acesso à Informação (Lei 12.527/2011).', tipo: 'text', descricao: 'Descrição do portal', ordem: 3 },
  { chave: 'logo_url', valor: '', tipo: 'url', descricao: 'URL do logo', ordem: 4 },
  { chave: 'favicon_url', valor: '', tipo: 'url', descricao: 'URL do favicon', ordem: 5 },
  
  // Contato
  { chave: 'endereco', valor: 'Rua Olavo Bilac, S/N - Centro\nTefé - AM, CEP 69470-000', tipo: 'text', descricao: 'Endereço da prefeitura', ordem: 10 },
  { chave: 'telefone_contato', valor: '(97) 3343-2527', tipo: 'text', descricao: 'Telefone de contato', ordem: 11 },
  { chave: 'email_contato', valor: 'transparencia@prefeitura.gov.br', tipo: 'email', descricao: 'E-mail de contato', ordem: 12 },
  { chave: 'horario_funcionamento', valor: 'Seg. a Sex., 08h às 14h', tipo: 'text', descricao: 'Horário de funcionamento', ordem: 13 },
  
  // Redes Sociais
  { chave: 'facebook', valor: '', tipo: 'url', descricao: 'Link do Facebook', ordem: 20 },
  { chave: 'instagram', valor: '', tipo: 'url', descricao: 'Link do Instagram', ordem: 21 },
  { chave: 'youtube', valor: '', tipo: 'url', descricao: 'Link do YouTube', ordem: 22 },
  { chave: 'twitter', valor: '', tipo: 'url', descricao: 'Link do Twitter/X', ordem: 23 },
  
  // Links Úteis
  { chave: 'link_site_oficial', valor: 'https://www.gov.br', tipo: 'url', descricao: 'Site oficial da prefeitura', ordem: 30 },
  { chave: 'link_pncp', valor: 'https://pncp.gov.br', tipo: 'url', descricao: 'Link do PNCP', ordem: 31 },
  { chave: 'link_portal_nacional', valor: 'https://portaldatransparencia.gov.br', tipo: 'url', descricao: 'Link do Portal Nacional', ordem: 32 },
  { chave: 'link_fala_br', valor: 'https://falabr.cgu.gov.br', tipo: 'url', descricao: 'Link do Fala.BR', ordem: 33 },
  { chave: 'link_diario_oficial', valor: '', tipo: 'url', descricao: 'Link do Diário Oficial', ordem: 34 },
  
  // Rodapé
  { chave: 'texto_rodape', valor: '© {ano} Prefeitura Municipal. Todos os direitos reservados.', tipo: 'text', descricao: 'Texto do rodapé', ordem: 40 },
  { chave: 'link_privacidade', valor: '/privacidade', tipo: 'url', descricao: 'Link política de privacidade', ordem: 41 },
  { chave: 'link_acessibilidade', valor: '/acessibilidade', tipo: 'url', descricao: 'Link de acessibilidade', ordem: 42 },
  
  // Cores
  { chave: 'cor_primaria', valor: '#059669', tipo: 'color', descricao: 'Cor primária (hex)', ordem: 50 },
  { chave: 'cor_secundaria', valor: '#047857', tipo: 'color', descricao: 'Cor secundária (hex)', ordem: 51 },
  
  // Dados do município
  { chave: 'nome_municipio', valor: 'Tefé', tipo: 'text', descricao: 'Nome do município', ordem: 60 },
  { chave: 'estado', valor: 'AM', tipo: 'text', descricao: 'Estado', ordem: 61 },
  { chave: 'texto_lai', valor: 'Lei 12.527/2011', tipo: 'text', descricao: 'Texto da LAI no footer', ordem: 62 },
]

async function main() {
  console.log('🌱 Seed de configurações do site...\n')

  for (const config of siteConfigs) {
    const existing = await prisma.configuracaoSite.findUnique({
      where: { chave: config.chave }
    })

    if (!existing) {
      await prisma.configuracaoSite.create({ data: config })
      console.log(`✅ Criado: ${config.chave}`)
    } else {
      console.log(`⏭️  Já existe: ${config.chave}`)
    }
  }

  console.log('\n✅ Seed concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
