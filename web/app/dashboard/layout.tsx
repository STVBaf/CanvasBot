import { Sidebar } from '@/components/layout/sidebar';
import { Bell, Search, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-16 transition-all duration-300">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex items-center justify-between px-8">
          <div className="flex items-center flex-1">
            <div className="relative w-full max-w-md hidden md:flex items-center">
              <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索课程、作业，或询问 CanvasBot..."
                className="w-full bg-secondary border-none rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-full transition-colors hidden sm:flex">
              <Sparkles className="w-4 h-4" />
              <span>CanvasBot</span>
            </button>
            <ThemeToggle />
            <button className="p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors relative flex items-center justify-center">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
