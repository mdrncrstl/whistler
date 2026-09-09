const siteUrl = 'https://masterdeck.app'
const socialImage = `${siteUrl}/marketing/masterdeck-portfolio-hero.png`

type SeoInput = {
  title: string
  description: string
  path: string
  label?: string
  group?: string
  faqs?: readonly (readonly [string, string])[]
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.content = content
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    document.head.appendChild(element)
  }
  element.href = href
}

export function applySeo({ title, description, path, label, group, faqs }: SeoInput) {
  const url = `${siteUrl}${path}`
  document.title = title
  upsertLink('canonical', url)
  upsertMeta('name', 'description', description)
  upsertMeta('name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:url', url)
  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:site_name', 'Masterdeck')
  upsertMeta('property', 'og:locale', 'en_AU')
  upsertMeta('property', 'og:image', socialImage)
  upsertMeta('property', 'og:image:alt', 'Masterdeck portfolio workspace with performance and holdings data')
  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:description', description)
  upsertMeta('name', 'twitter:image', socialImage)

  document.head.querySelector('script[data-masterdeck-schema="dynamic"]')?.remove()
  const graph: Record<string, unknown>[] = [{
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: 'en-AU',
    isPartOf: { '@id': `${siteUrl}/#website` },
  }]
  if (path === '/') {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl}/#application`,
      name: 'Masterdeck',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      url: siteUrl,
      description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD', description: '14-day free trial' },
    })
  }
  if (path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Masterdeck', item: siteUrl },
        ...(group ? [{ '@type': 'ListItem', position: 2, name: group, item: `${siteUrl}/${group === 'Features' ? 'features' : group === 'Company' ? 'company' : 'for'}` }] : []),
        { '@type': 'ListItem', position: group ? 3 : 2, name: label ?? title, item: url },
      ],
    })
  }
  if (faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
    })
  }
  const schema = document.createElement('script')
  schema.type = 'application/ld+json'
  schema.dataset.masterdeckSchema = 'dynamic'
  schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
  document.head.appendChild(schema)
}
