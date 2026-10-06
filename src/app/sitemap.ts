import { MetadataRoute } from 'next';
import { getBaseUrl, PROVINCES, INITIAL_COMPANIES, getCompanySlug } from '@/lib/constants';

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

  const companyPages: MetadataRoute.Sitemap = INITIAL_COMPANIES.map((comp) => ({
    url: `${baseUrl}/${getCompanySlug(comp.id, comp.name)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  return [...staticPages, ...provincePages, ...companyPages];
}
