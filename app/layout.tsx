import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppSidebar } from "@/components/app-sidebar";
import { TitleBar } from '@/components/title-bar';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SCO AI履歷分析系統',
  description: '智能履歷分析與人才推薦系統',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <div className="flex h-screen">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto">
            <TitleBar />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
