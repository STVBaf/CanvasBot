'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarDays, 
  Users, 
  BrainCircuit, 
  Target,
  Settings, 
  LogOut 
} from 'lucide-react';

const navItems = [
  { name: '概览', href: '/dashboard', icon: LayoutDashboard },
  { name: '我的课程', href: '/dashboard/courses', icon: BookOpen },
  { name: '日程安排', href: '/dashboard/schedule', icon: CalendarDays },
  { name: '学习小组', href: '/dashboard/groups', icon: Users },
  { name: '知识库', href: '/dashboard/knowledge', icon: BrainCircuit },
  { name: '专注模式', href: '/dashboard/focus', icon: Target },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const isFocusMode = pathname === '/dashboard/focus';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseEnter = () => {
    if (!isMobile) setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!isMobile) setIsExpanded(false);
  };

  const handleClick = () => {
    if (isMobile) setIsExpanded(!isExpanded);
  };

  return (
    <aside 
      className={cn(
        "flex flex-col h-screen py-8 px-4 fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out shadow-sm hover:shadow-xl border-r",
        isFocusMode 
          ? "bg-black/20 border-white/10 backdrop-blur-xl" 
          : "bg-white/90 border-gray-200 backdrop-blur-md",
        isExpanded ? "w-64" : "w-20"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Logo Area */}
      <div className="flex items-center mb-12 px-1 overflow-hidden whitespace-nowrap">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img 
            src="/icon/CanvasEduBotIcon.png" 
            alt="Canvas Logo" 
            className="w-full h-full object-cover"
          />
        </div>
        <span className={cn(
          "ml-3 text-xl font-bold transition-opacity duration-300",
          isFocusMode ? "text-white" : "text-foreground",
          isExpanded ? "opacity-100" : "opacity-0 w-0"
        )}>
          CanvasBot
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center p-3 rounded-2xl transition-all duration-200 group overflow-hidden whitespace-nowrap",
                isActive 
                  ? (isFocusMode ? "bg-white/20 text-white shadow-lg shadow-white/5" : "bg-primary/10 text-primary")
                  : (isFocusMode ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-gray-100 hover:text-primary")
              )}
            >
              <item.icon className={cn("w-6 h-6 flex-shrink-0", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              <span className={cn(
                "ml-4 font-medium transition-all duration-300",
                isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 w-0",
                isActive && "font-bold"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto space-y-4">
        <Link 
          href="/dashboard/settings"
          className={cn(
            "w-full flex items-center p-3 rounded-2xl transition-all overflow-hidden whitespace-nowrap",
            isFocusMode 
              ? "text-gray-400 hover:bg-white/10 hover:text-white" 
              : "text-muted-foreground hover:bg-gray-100 hover:text-primary"
          )}
        >
          <Settings className="w-6 h-6 flex-shrink-0" />
          <span className={cn(
            "ml-4 font-medium transition-all duration-300",
            isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 w-0"
          )}>
            设置
          </span>
        </Link>
        
        <div className={cn("pt-4 border-t", isFocusMode ? "border-white/10" : "border-gray-200/50")}>
          <Link href="/dashboard/profile" className="block">
            <div className={cn(
              "flex items-center p-2 rounded-2xl transition-colors cursor-pointer overflow-hidden whitespace-nowrap",
              isFocusMode ? "hover:bg-white/10" : "hover:bg-gray-50"
            )}>
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                {/* Placeholder Avatar */}
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
              </div>
              <div className={cn(
                "ml-3 transition-all duration-300",
                isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 w-0"
              )}>
                <p className={cn("text-sm font-bold", isFocusMode ? "text-white" : "text-foreground")}>同学你好</p>
                <p className={cn("text-xs", isFocusMode ? "text-gray-400" : "text-muted-foreground")}>在线</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
