'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Plus, LogOut, Trash2, BookOpen, X, Loader2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import type { StudyGroup, Course } from '@/lib/types';

export default function GroupsPage() {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const [actionType, setActionType] = useState<'leave' | 'disband' | 'join' | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsData, coursesData] = await Promise.all([
        api.getAllGroups(),  // 🔑 获取所有课程的所有小组（全局列表）
        api.getCourses()
      ]);
      // 增加安全检查，确保返回的是数组
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setGroups([]); // 出错时也设置为空数组
    } finally {
      setLoading(false);
    }
  };

  // 🔑 修复：只统计用户已加入的小组的课程ID
  const joinedCourseIds = groups
    .filter(g => g.isMember || g.isCreator)  // 只过滤已加入的小组
    .map(g => g.courseId);

  const openCreateModal = () => {
    setNewGroupName('');
    setSelectedCourseId('');
    setIsCreateModalOpen(true);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName || !selectedCourseId) return;
    setIsCreating(true);
    try {
      const selectedCourse = courses.find(c => String(c.id) === selectedCourseId);
      if (!selectedCourse) throw new Error("Selected course not found");

      await api.createGroup({
        name: newGroupName,
        courseId: selectedCourseId,
        courseName: selectedCourse.name,
        description: 'Created via CanvasBot'
      });
      await fetchData();
      setIsCreateModalOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.message || '创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  const openConfirmModal = (group: StudyGroup, type: 'leave' | 'disband' | 'join') => {
    if (type === 'join' && joinedCourseIds.includes(group.courseId)) {
      alert(`您已经加入了该课程 (${group.courseName}) 的另一个小组，无法加入此组。`);
      return;
    }
    setSelectedGroup(group);
    setActionType(type);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedGroup || !actionType) return;
    setIsActionLoading(true);
    try {
      if (actionType === 'leave') await api.leaveGroup(selectedGroup.id);
      else if (actionType === 'disband') await api.disbandGroup(selectedGroup.id);
      else if (actionType === 'join') await api.joinGroup(selectedGroup.id);
      await fetchData();
      setIsConfirmModalOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.message || '操作失败');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getRoleBadge = (group: StudyGroup) => {
    if (group.isCreator) return <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-bold">组长</span>;
    if (group.isMember) return <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">成员</span>;
    return null;
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">学习小组</h1>
          <p className="text-muted-foreground mt-1">加入小组与同学共同进步，或创建属于你的学习圈子</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" /> 创建新小组
        </button>
      </div>

      {/* 空状态判断 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-3xl animate-pulse" />)}</div>
      ) : groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="group hover:shadow-lg transition-all duration-300 border-none rounded-[2rem] overflow-hidden bg-card">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-indigo-100 text-indigo-600"><Users className="w-6 h-6" /></div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground line-clamp-1">{group.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1"><BookOpen className="w-3 h-3" /><span className="line-clamp-1">{group.courseName}</span></div>
                    </div>
                  </div>
                  {getRoleBadge(group)}
                </div>
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">成员 ({group.memberCount})</span></div>
                  <div className="flex flex-wrap gap-2">
                    {group.members?.slice(0, 4).map((member) => <span key={member.id} className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded-lg">{member.user.name}</span>)}
                    {(group.members?.length || 0) > 4 && <span className="text-xs text-muted-foreground px-1 py-1">...</span>}
                  </div>
                </div>
                <div className="pt-4 border-t border-border flex gap-2">
                  {group.isCreator ? (
                    <button onClick={() => openConfirmModal(group, 'disband')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /> 解散小组</button>
                  ) : group.isMember ? (
                    <button onClick={() => openConfirmModal(group, 'leave')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-50 text-orange-600 text-sm font-bold hover:bg-orange-100 transition-colors"><LogOut className="w-4 h-4" /> 退出小组</button>
                  ) : (
                    <button onClick={() => openConfirmModal(group, 'join')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors bg-primary text-primary-foreground hover:opacity-90"><UserPlus className="w-4 h-4" /> 加入小组</button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p>暂无小组信息</p>
          <p className="mt-2 text-sm">点击右上角的“创建新小组”按钮来创建一个吧！</p>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">创建新小组</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-secondary rounded-full"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-muted-foreground mb-2">小组名称</label>
                <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="例如：CS101 期末突击队" className="w-full px-4 py-3 rounded-xl bg-secondary border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-muted-foreground mb-2">所属课程</label>
                <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border-none focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer appearance-none">
                  <option value="" disabled>选择课程...</option>
                  {courses.map(course => {
                    const isJoined = joinedCourseIds.includes(String(course.id));
                    return <option key={course.id} value={course.id} disabled={isJoined} className={isJoined ? 'text-muted-foreground' : ''}>{course.name} ({course.course_code}) {isJoined ? '- 已有小组' : ''}</option>;
                  })}
                </select>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-muted-foreground hover:bg-secondary transition-colors">取消</button>
              <button onClick={handleCreateGroup} disabled={!newGroupName || !selectedCourseId || isCreating} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : '确认创建'}</button>
            </div>
          </div>
        </div>
      )}
      {isConfirmModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-2">{actionType === 'leave' ? '退出小组' : actionType === 'disband' ? '解散小组' : '加入小组'}</h3>
            <p className="text-muted-foreground mb-6">{actionType === 'leave' && `确定要退出 "${selectedGroup.name}" 吗？`}{actionType === 'disband' && `确定要解散 "${selectedGroup.name}" 吗？此操作无法撤销。`}{actionType === 'join' && `确定要加入 "${selectedGroup.name}" 吗？`}</p>
            <div className="flex gap-3">
              <button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-muted-foreground hover:bg-secondary transition-colors">取消</button>
              <button onClick={handleConfirmAction} disabled={isActionLoading} className={`flex-1 py-3 rounded-xl text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 ${actionType === 'disband' ? 'bg-red-500' : actionType === 'leave' ? 'bg-orange-500' : 'bg-primary'}`}>{isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '确认'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}