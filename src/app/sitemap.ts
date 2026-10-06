import { MetadataRoute } from 'next';
import { getBaseUrl, PROVINCES, INITIAL_COMPANIES, getCompanySlug } from '@/lib/constants';
import harvestedJson from '@/data/harvested_provinces.json';

interface HarvestedItem {
  id: string;
  name: string;
  slug?: string;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/tra-cuu-ma-so-thue-theo-tinh`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tra-cuu-ma-so-thue-theo-nganh-nghe`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/lien-he`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const provincePages: MetadataRoute.Sitemap = PROVINCES.map((prov) => ({
    url: `${baseUrl}/tra-cuu-ma-so-thue-theo-tinh?tinh=${prov.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const companyMap = new Map<string, string>();
  for (const comp of INITIAL_COMPANIES) {
    companyMap.set(comp.id, getCompanySlug(comp.id, comp.name));
  }

  // Include top fresh companies from harvested database for rapid Google indexing
  const harvestedRecords = harvestedJson as Record<string, HarvestedItem[]>;
  let harvestedCount = 0;
  for (const list of Object.values(harvestedRecords)) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item.id && !companyMap.has(item.id)) {
        companyMap.set(item.id, item.slug || getCompanySlug(item.id, item.name));
        harvestedCount++;
        if (harvestedCount >= 2000) break;
      }
    }
    if (harvestedCount >= 2000) break;
  }

  const companyPages: MetadataRoute.Sitemap = Array.from(companyMap.values()).map((slug) => ({
    url: `${baseUrl}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...provincePages, ...companyPages];
}
