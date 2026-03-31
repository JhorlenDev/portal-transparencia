interface OrganizationSchema {
  name: string
  description: string
  url: string
  logo?: string
  contactPoint?: {
    telephone: string
    email: string
  }
  address?: {
    addressLocality: string
    addressRegion: string
    streetAddress: string
  }
}

interface BreadcrumbItem {
  name: string
  url: string
}

interface WebPageSchema {
  title: string
  description: string
  url: string
  breadcrumbs?: BreadcrumbItem[]
}

interface TableSchema {
  name: string
  description: string
  columns: string[]
  rowCount: number
}

interface StructuredDataProps {
  type: "organization" | "webpage" | "table" | "faq" | "breadcrumb"
  data: OrganizationSchema | WebPageSchema | TableSchema | BreadcrumbItem[] | any
}

export function StructuredData({ type, data }: StructuredDataProps) {
  let schema: any = null

  switch (type) {
    case "organization": {
      const org = data as OrganizationSchema
      schema = {
        "@context": "https://schema.org",
        "@type": "GovernmentOrganization",
        "name": org.name,
        "description": org.description,
        "url": org.url,
        ...(org.logo && { "logo": org.logo }),
        ...(org.contactPoint && {
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": org.contactPoint.telephone,
            "contactType": "customer service",
            "email": org.contactPoint.email
          }
        }),
        ...(org.address && {
          "address": {
            "@type": "PostalAddress",
            "addressLocality": org.address.addressLocality,
            "addressRegion": org.address.addressRegion,
            "streetAddress": org.address.streetAddress
          }
        })
      }
      break
    }

    case "webpage": {
      const page = data as WebPageSchema
      schema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": page.title,
        "description": page.description,
        "url": page.url,
        ...(page.breadcrumbs && {
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": page.breadcrumbs.map((item, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "name": item.name,
              "item": item.url
            }))
          }
        })
      }
      break
    }

    case "table": {
      const table = data as TableSchema
      schema = {
        "@context": "https://schema.org",
        "@type": "Table",
        "name": table.name,
        "description": table.description,
        "about": {
          "@type": "Dataset",
          "name": table.name,
          "description": table.description,
          "columns": table.columns
        },
        "numberOfRows": table.rowCount
      }
      break
    }

    case "breadcrumb": {
      const items = data as BreadcrumbItem[]
      schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "item": item.url
        }))
      }
      break
    }
  }

  if (!schema) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
