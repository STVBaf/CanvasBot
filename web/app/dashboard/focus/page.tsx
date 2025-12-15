'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Coffee, Brain, ChevronLeft, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import GalaxyBackground from '@/components/GalaxyBackground';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const MODES: Record<TimerMode, { label: string; minutes: number; color: string; icon: any }> = {
  focus: { label: '专注模式', minutes: 25, color: 'bg-indigo-500', icon: Brain },
  shortBreak: { label: '短休息', minutes: 5, color: 'bg-emerald-500', icon: Coffee },
  longBreak: { label: '长休息', minutes: 15, color: 'bg-blue-500', icon: Coffee },
};

export default function FocusPage() {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [task, setTask] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentMode = MODES[mode];

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode].minutes * 60);
  };

  const changeMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(MODES[newMode].minutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <GalaxyBackground />
      
      <div className="relative z-10 p-8 max-w-4xl mx-auto w-full flex flex-col flex-1">
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-gray-300 hover:text-white transition-colors mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" /> 返回概览
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-300" /> 专注时刻
          </h1>
          <p className="text-gray-400">沉浸在星空中，高效完成任务。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1">
          {/* Timer Card */}
          <Card className="md:col-span-2 p-8 flex flex-col items-center justify-center relative overflow-hidden bg-white/10 backdrop-blur-md border-white/10 shadow-2xl rounded-3xl">
            {/* Background Progress Circle (Decorative) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
               <motion.div 
                 className={cn("w-[500px] h-[500px] rounded-full blur-3xl", currentMode.color)}
                 animate={{ scale: isActive ? [1, 1.1, 1] : 1 }}
                 transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
               />
            </div>

            <div className="z-10 flex flex-col items-center w-full max-w-md">
              {/* Mode Switcher */}
              <div className="flex bg-black/20 p-1 rounded-full mb-12 backdrop-blur-sm border border-white/5">
                {(Object.keys(MODES) as TimerMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => changeMode(m)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all",
                      mode === m ? "bg-white/20 text-white shadow-sm backdrop-blur-md" : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {MODES[m].label}
                  </button>
                ))}
              </div>

              {/* Timer Display */}
              <div className="relative mb-12">
                 <motion.div 
                   key={mode}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="text-9xl font-bold tracking-tighter tabular-nums text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                 >
                   {formatTime(timeLeft)}
                 </motion.div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6">
                <button
                  onClick={toggleTimer}
                  className={cn(
                    "h-20 w-20 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all border border-white/20 backdrop-blur-sm",
                    currentMode.color
                  )}
                >
                  {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>
                
                <button
                  onClick={resetTimer}
                  className="h-14 w-14 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 backdrop-blur-sm"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              </div>
            </div>
          </Card>

          {/* Task & Stats Column */}
          <div className="space-y-6">
            {/* Current Task Input */}
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/10 shadow-xl rounded-3xl">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-300" /> 当前任务
              </h3>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="你正在专注做什么？..."
                className="w-full bg-black/20 border-b-2 border-white/10 focus:border-indigo-400 outline-none py-2 text-lg resize-none h-24 placeholder:text-gray-500 text-white rounded-lg px-3 transition-colors"
              />
            </Card>

            {/* Tips / Stats */}
            <Card className="p-6 bg-black/40 backdrop-blur-md border-white/10 shadow-xl rounded-3xl">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-white">
                <Coffee className="w-5 h-5 text-yellow-400" /> 专注贴士
              </h3>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex gap-2">
                  <span className="text-yellow-400">•</span>
                  保持环境安静，减少干扰。
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-400">•</span>
                  每完成4个番茄钟，进行一次长休息。
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-400">•</span>
                  休息时离开屏幕，眺望远方。
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
