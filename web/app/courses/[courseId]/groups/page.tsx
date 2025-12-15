'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { StudyGroup } from '@/lib/types';

export default function GroupPage() {
  const params = useParams();
  const courseId = String(params.courseId);
  
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // 加载课程名称
  const [courseName, setCourseName] = useState('');

  // 加载小组列表 - 使用 getCourseGroups 显示所有学生的小组
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.getCourseGroups(courseId);  // 🔑 关键：显示课程所有小组
        setGroups(data);
      } catch (err) {
        console.error("加载小组失败", err);
        setError('加载小组失败，请刷新重试');
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [courseId]);

  // 获取当前用户信息
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await api.getMe();
        setCurrentUserId(user.id);
      } catch (err) {
        console.error("获取用户信息失败", err);
      }
    };
    fetchUser();
  }, []);

  // 获取课程名称
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const courses = await api.getCourses();
        const course = courses.find(c => String(c.id) === courseId);
        if (course) {
          setCourseName(course.name);
        }
      } catch (err) {
        console.error("获取课程信息失败", err);
      }
    };
    fetchCourse();
  }, [courseId]);

  // 加入小组
  const handleJoinGroup = async (groupName: string, groupId: string) => {
    const alreadyInGroup = groups.some(g => 
      g.members.some(m => m.userId === currentUserId) && g.id !== groupId
    );
    
    if (alreadyInGroup) {
      alert("你已经加入了一个小组，请先退出当前小组！");
      return;
    }

    if (!confirm(`确认要加入小组"${groupName}"吗？`)) {
      return;
    }

    try {
      await api.joinGroup(groupId);
      const data = await api.getCourseGroups(courseId);
      setGroups(data);
      alert('成功加入小组！');
    } catch (err) {
      console.error("加入小组失败", err);
      alert('加入小组失败，请重试');
    }
  };

  // 退出小组
  const handleQuitGroup = async (groupName: string, groupId: string) => {
    if (!confirm(`确认要退出小组"${groupName}"吗？`)) {
      return;
    }

    try {
      await api.leaveGroup(groupId);
      const data = await api.getCourseGroups(courseId);
      setGroups(data);
      alert('成功退出小组！');
    } catch (err) {
      console.error("退出小组失败", err);
      alert('退出小组失败，请重试');
    }
  };

  // 解散小组
  const handleDisbandGroup = async (groupId: string) => {
    if (!confirm("确定要解散这个小组吗？此操作不可恢复。")) return;

    try {
      await api.disbandGroup(groupId);
      const data = await api.getCourseGroups(courseId);
      setGroups(data);
      alert('小组已解散！');
    } catch (err) {
      console.error("解散小组失败", err);
      alert('解散小组失败，请重试');
    }
  };

  //点击创建按钮
  const handleCreateClick = () => {
    if (!newGroupName.trim()) {
      alert("请输入小组名称");
      return;
    }
    setIsModalOpen(true); // 打开弹窗
  };

  // 确认创建
  const confirmCreateGroup = async () => {
    try {
      await api.createGroup({
        courseId,
        courseName: courseName || `课程 ${courseId}`,
        name: newGroupName,
        description: newGroupDescription,
      });
      
      const data = await api.getCourseGroups(courseId);
      setGroups(data);
      
      setNewGroupName('');
      setNewGroupDescription('');
      setIsModalOpen(false);
      alert('小组创建成功！');
    } catch (err) {
      console.error("创建小组失败", err);
      alert('创建小组失败，请重试');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 relative">
      <div className="mb-6">
        <Link href={`/courses/${params.courseId}`} className="text-gray-500 hover:text-gray-900">
          &larr; 返回课程详情
        </Link>
        <h1 className="text-2xl font-bold mt-2">👥 课程分组协作</h1>
        <p className="text-gray-600">选择一个小组加入，或者创建你自己的小组。</p>
      </div>

      {/*创建小组区域*/}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">新建小组名称</label>
            <input 
              type="text" 
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="例如：EDG"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">小组描述（可选）</label>
            <input 
              type="text" 
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              placeholder="例如：专注于数据分析"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <button 
            onClick={handleCreateClick}
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 h-10 whitespace-nowrap"
          >
            创建并加入
          </button>
        </div>
      </div>

      {/* 小组列表展示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map(group => {
          const isMember = group.members.some(m => m.userId === currentUserId);
          const isCreator = group.creator.id === currentUserId;
          
          return (
            <div key={group.id} className="border rounded-lg p-6 bg-white hover:shadow-md transition relative">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900">{group.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {group.memberCount} 人
                  </span>
                  
                  {isCreator && (
                    <button 
                      onClick={() => handleDisbandGroup(group.id)}
                      className="text-xs text-red-500 hover:text-red-700 underline font-medium"
                    >
                      解散小组
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-xs text-gray-500 mb-2">组长: {group.creator.name || group.creator.email}</p>
                <p className="text-xs text-gray-500 mb-1">成员:</p>
                <div className="flex flex-wrap gap-2">
                  {group.members.map(member => (
                    <span 
                      key={member.id} 
                      className={`text-xs px-2 py-1 rounded-full ${
                        member.role === 'creator' 
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {member.user.name || member.user.email}
                      {member.role === 'creator' && ' 👑'}
                    </span>
                  ))}
                </div>
              </div>

              {/* 底部按钮：加入/退出 */}
              <div className="mt-auto">
                {isMember ? (
                  isCreator ? (
                    <button disabled className="w-full bg-gray-100 text-gray-400 py-2 rounded cursor-not-allowed text-sm">
                      你是组长 (请解散以移除)
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleQuitGroup(group.name, group.id)}
                      className="w-full border border-red-200 text-red-600 py-2 rounded hover:bg-red-50"
                    >
                      退出小组
                    </button>
                  )
                ) : (
                  <button 
                    onClick={() => handleJoinGroup(group.name, group.id)}
                    className="w-full border border-indigo-600 text-indigo-600 py-2 rounded hover:bg-indigo-50"
                  >
                    加入该组
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/*创造小组确认*/}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold mb-4">确认创建小组</h3>
            <p className="text-gray-600 mb-6">
              小组名称：<span className="font-semibold text-indigo-600">{newGroupName}</span>
              <br/>
              {newGroupDescription && (
                <>
                  描述：<span className="text-sm text-gray-700">{newGroupDescription}</span>
                  <br/>
                </>
              )}
              <span className="text-sm text-gray-500">创建后你将自动成为<span className="font-bold text-indigo-600">组长</span>。</span>
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                取消
              </button>
              <button 
                onClick={confirmCreateGroup}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                确定创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}