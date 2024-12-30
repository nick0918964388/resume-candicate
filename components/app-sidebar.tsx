'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Users, 
  Settings, 
  BarChart, 
  Calendar,
  MessageSquare,
  Mail,
  PieChart,
  UserPlus,
  Briefcase
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AppSidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const sidebarItems = [
    {
      title: "系統設定",
      icon: Settings,
      items: [
        { title: "系統設定", href: "/settings" },
      ],
    },
    
  ];

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen border-r",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="flex items-center justify-end p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 py-4">
          {sidebarItems.map((section, i) => (
            <div key={i} className="px-3 py-2">
              <h2
                className={cn(
                  "mb-2 text-lg font-semibold tracking-tight flex items-center",
                  isCollapsed ? "hidden" : ""
                )}
              >
                <section.icon className="h-4 w-4 mr-2" />
                {!isCollapsed && section.title}
              </h2>
              <div className="space-y-1">
                {section.items.map((item, j) => (
                  <Link key={j} href={item.href}>
                    <Button
                      variant={pathname === item.href ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        isCollapsed ? "p-0 h-0 overflow-hidden" : ""
                      )}
                    >
                      {!isCollapsed && item.title}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
  