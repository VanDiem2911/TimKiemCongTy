import { MetadataRoute } from 'next';
import { getBaseUrl, PROVINCES, INITIAL_COMPANIES, getCompanySlug } from '@/lib/constants';
import harvestedJson from '@/data/harvested_provinces.json';

interface HarvestedItem {
  id: string;
  name: string;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();

  // Không khai lastModified: trước đây mọi URL đều mang ngày build nên Google
  // thấy ngày sửa luôn "vừa đổi" mà nội dung không đổi, và bỏ qua trường này.
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/tra-cuu-ma-so-thue-theo-tinh`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tra-cuu-ma-so-thue-theo-nganh-nghe`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/lien-he`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Trang tỉnh thật nằm ở /tra-cuu-ma-so-thue-theo-tinh/{slug}. Dạng ?tinh=
  // cũ không được trang nào đọc nên cả 63 URL đó trả về cùng nội dung với trang
  // danh sách chung.
  const provincePages: MetadataRoute.Sitemap = PROVINCES.map((prov) => ({
    url: `${baseUrl}/tra-cuu-ma-so-thue-theo-tinh/${prov.slug}`,
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
        // Luôn dựng slug bằng getCompanySlug: slug lưu sẵn trong dữ liệu cào
        // có 257 bản ghi bị hỏng dấu, trang chi tiết sẽ chuyển hướng chúng sang
        // slug chuẩn nên không được đưa vào sitemap.
        companyMap.set(item.id, getCompanySlug(item.id, item.name));
        harvestedCount++;
        if (harvestedCount >= 2000) break;
      }
    }
    if (harvestedCount >= 2000) break;
  }

  const companyPages: MetadataRoute.Sitemap = Array.from(companyMap.values()).map((slug) => ({
    url: `${baseUrl}/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...provincePages, ...companyPages];
}
