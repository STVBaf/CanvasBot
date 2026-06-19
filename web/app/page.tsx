'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [token, setToken] = useState('');
  const router = useRouter();

  const saveToken = () => {
    const trimmedToken = token.trim();
    if (trimmedToken && trimmedToken.length > 20) {
      localStorage.setItem('canvas_token', trimmedToken);
      alert('Token已保存！即将进入学习空间');
      router.push('/dashboard'); // 保存后跳转到登录确认页
    } else {
      alert('请输入有效的Canvas Access Token（长度需大于20字符）');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 w-96 p-8 bg-white rounded-3xl shadow-sm">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
          <img 
            src="/icon/CanvasEduBotIcon.png" 
            alt="Canvas Logo" 
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-3xl font-bold text-foreground">CanvasBot</h1>
        <p className="text-muted-foreground">一键同步 Canvas 课程与作业</p>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="请粘贴 Canvas Access Token"
          className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <button
          onClick={saveToken}
          className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-opacity"
        >
          保存并继续
        </button>
      </div>
    </main>
  );
}