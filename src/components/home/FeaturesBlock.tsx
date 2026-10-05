import React from 'react';
import { RefreshCw, CheckCircle2, MonitorSmartphone, Building2, MapPin } from 'lucide-react';

export function FeaturesBlock() {
  const features = [
    {
      icon: <RefreshCw className="w-5 h-5 text-amber-500" />,
      title: 'Cập nhật',
      subtitle: 'liên tục'
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      title: 'Thông tin',
      subtitle: 'chính xác'
    },
    {
      icon: <MonitorSmartphone className="w-5 h-5 text-blue-500" />,
      title: 'Hỗ trợ',
      subtitle: 'đa nền tảng'
    },
    {
      icon: <Building2 className="w-5 h-5 text-purple-500" />,
      title: '2 triệu',
      subtitle: 'doanh nghiệp'
    },
    {
      icon: <MapPin className="w-5 h-5 text-red-500" />,
      title: '63 tỉnh',
      subtitle: 'thành phố'
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded my-4 py-4 px-2 shadow-sm hidden sm:block">
      <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {features.map((feat, idx) => (
          <div key={idx} className="flex items-center justify-center space-x-3 py-2 px-3">
            <div className="p-2 bg-gray-50 rounded-full">{feat.icon}</div>
            <div className="text-xs">
              <strong className="block text-gray-900 font-bold">{feat.title}</strong>
              <span className="text-gray-500">{feat.subtitle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
