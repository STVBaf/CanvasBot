'use client';

import { useState } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalAIFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-4 w-[360px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-card border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-none">CanvasBot Agent</h3>
                    <p className="text-xs text-muted-foreground mt-1">基于当前页面上下文回答</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 -mr-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm bg-background/50">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-sm text-foreground shadow-sm">
                    你好！我是 CanvasBot，需要我帮你总结当前的课程，还是查看下一步截止的作业？
                  </div>
                </div>
              </div>
              
              <div className="p-3 border-t border-border bg-card">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="问点什么..."
                    className="w-full bg-secondary border-none rounded-full pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button className="absolute right-1.5 p-1.5 bg-primary text-primary-foreground rounded-full hover:opacity-90">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${isOpen ? 'bg-secondary text-foreground border border-border' : 'bg-primary text-primary-foreground hover:shadow-primary/25 hover:shadow-2xl'}`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
}
