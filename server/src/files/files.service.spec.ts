import { FilesService } from './files.service';

describe('FilesService', () => {
  it('queues downloads by userId and canvasFileId only', async () => {
    const user = { id: 'user-1', email: 'u@example.com', name: null, avatar: null, canvasId: 'canvas-user-1' };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
      token: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'token-1' }),
      },
      fileMeta: {
        upsert: jest.fn().mockResolvedValue({ id: 'file-meta-1' }),
      },
    };
    const canvas = {
      getUserProfile: jest.fn().mockResolvedValue({
        id: 'canvas-user-1',
        primary_email: 'u@example.com',
      }),
      getCourseFiles: jest.fn().mockResolvedValue([
        {
          id: 123,
          display_name: 'slides.pdf',
          filename: 'slides.pdf',
          url: 'https://canvas.example/files/123/download',
          size: 1024,
          content_type: 'application/pdf',
        },
      ]),
    };
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const service = new FilesService(prisma as any, canvas as any, queue as any);

    await service.syncCourseFilesByToken('canvas-token', 'course-1');

    expect(prisma.fileMeta.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_canvasFileId: {
          userId: 'user-1',
          canvasFileId: '123',
        },
      },
    }));
    expect(queue.add).toHaveBeenCalledWith(
      'download',
      {
        userId: 'user-1',
        canvasFileId: '123',
      },
      expect.objectContaining({
        jobId: 'file-download:user-1:123',
        attempts: 3,
      }),
    );
  });
});
