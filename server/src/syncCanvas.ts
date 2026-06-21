// syncCanvas.ts
import { PrismaClient } from '@prisma/client';
import { getActiveCourses, getCourseFiles } from './canvasClient'; // 引入你刚才写好的文件

const prisma = new PrismaClient();

// ⚠️ 注意：这里假设我们要把数据关联到 ID 为 1 的用户
// (也就是你之前用 script.ts 创建的那个测试用户)
const TARGET_USER_ID = '1'; 

async function main() {
  console.log('🚀 开始同步 Canvas 数据...');

  // 1. 获取课程列表
  console.log('📡 正在连接 Canvas API 获取课程...');
  const courses = await getActiveCourses();
  
  if (courses.length === 0) {
    console.log('⚠️ 未找到活跃课程，请检查 Token 是否正确，或者当前学期是否有课。');
    return;
  }

  console.log(`📚 成功获取 ${courses.length} 门课程`);

  // 2. 遍历每门课，获取文件
  for (const course of courses) {
    const courseName = course.name || course.course_code;
    console.log(`\n------------------------------------------------`);
    console.log(`正在处理: [${course.course_code}] ${courseName}`);

    const files = await getCourseFiles(course.id);
    console.log(`   📄 发现 ${files.length} 个文件`);

    if (files.length === 0) continue;

    // 3. 存入数据库
    for (const file of files) {
      const canvasFileId = String(file.id);
      await prisma.fileMeta.upsert({
        where: {
          userId_canvasFileId: {
            userId: TARGET_USER_ID,
            canvasFileId,
          },
        },
        update: {
          fileName: file.display_name,
          courseId: String(course.id),
          downloadUrl: file.url,
        },
        create: {
          fileName: file.display_name,
          canvasFileId,
          courseId: String(course.id),
          userId: TARGET_USER_ID,
          downloadUrl: file.url,
          status: 'pending',
        },
      });
      console.log(`   ✅ 已同步入库: ${file.display_name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ 同步过程中出错:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n🏁 同步任务结束');
  });
