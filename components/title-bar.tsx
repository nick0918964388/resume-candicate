'use client';

import { usePathname } from 'next/navigation';

interface TitleBarProps {
  projectName?: string;
}

export function TitleBar({ projectName }: TitleBarProps) {
  const pathname = usePathname();
  
  // 根據路徑返回對應的標題
  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'SCO AI智能履歷分析系統';
      case '/dashboard':
        return '數據總覽';
      case '/settings':
        return '系統設定';
      default:
        return 'SCO AI系統';
    }
  };

  return (
    <div className="bg-white border-b">
      <div className="flex h-16 items-center px-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              {getPageTitle()}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              智能化人才評估與推薦平台
            </p>
          </div>
          {projectName !== undefined && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">目前專案：</p>
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {projectName || '未選擇專案'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 