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
        "flex flex-col h-screen py-6 px-3 fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out border-r",
        isFocusMode 
          ? "bg-black/90 border-white/10 backdrop-blur-xl text-white" 
          : "bg-background border-border",
        isExpanded ? "w-64 shadow-2xl" : "w-16"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Logo Area */}
      <div className="flex items-center mb-8 px-1 overflow-hidden whitespace-nowrap">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/5 text-primary">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <span className={cn(
          "ml-3 text-lg font-semibold tracking-tight transition-opacity duration-300",
          isFocusMode ? "text-white" : "text-foreground",
          isExpanded ? "opacity-100" : "opacity-0 w-0"
        )}>
          CanvasBot
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center p-2.5 rounded-xl transition-all duration-200 group overflow-hidden whitespace-nowrap",
                isActive 
                  ? (isFocusMode ? "bg-white/20 text-white" : "bg-secondary text-secondary-foreground font-medium shadow-sm")
                  : (isFocusMode ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground", isFocusMode && isActive && "text-white", isFocusMode && !isActive && "text-gray-400 group-hover:text-white")} />
              <span className={cn(
                "ml-3 text-sm transition-all duration-300",
                isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 w-0"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto space-y-2 pt-4">
        <Link 
          href="/dashboard/settings"
          className={cn(
            "w-full flex items-center p-2.5 rounded-xl transition-all overflow-hidden whitespace-nowrap",
            isFocusMode 
              ? "text-gray-400 hover:bg-white/10 hover:text-white" 
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <span className={cn(
            "ml-3 text-sm font-medium transition-all duration-300",
            isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 w-0"
          )}>
            设置
          </span>
        </Link>
        
        <div className={cn("pt-4 border-t", isFocusMode ? "border-white/10" : "border-border")}>
          <Link href="/dashboard/profile" className="block">
            <div className={cn(
              "flex items-center p-1.5 rounded-xl transition-colors cursor-pointer overflow-hidden whitespace-nowrap",
              isFocusMode ? "hover:bg-white/10" : "hover:bg-secondary"
            )}>
              <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex-shrink-0 border border-border flex items-center justify-center text-xs font-medium">
                S
              </div>
              <div className={cn(
                "ml-3 transition-all duration-300",
                isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 w-0"
              )}>
                <p className={cn("text-sm font-medium leading-none", isFocusMode ? "text-white" : "text-foreground")}>Student</p>
                <p className={cn("text-[10px] mt-1", isFocusMode ? "text-gray-400" : "text-muted-foreground")}>Free Plan</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
