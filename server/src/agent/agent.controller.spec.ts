import { HttpException } from '@nestjs/common';
import { AgentController } from './agent.controller';

describe('AgentController quota and audit', () => {
  const originalMax = process.env.AGENT_RATE_LIMIT_MAX;
  const originalWindow = process.env.AGENT_RATE_LIMIT_WINDOW_MS;

  afterEach(() => {
    if (originalMax === undefined) {
      delete process.env.AGENT_RATE_LIMIT_MAX;
    } else {
      process.env.AGENT_RATE_LIMIT_MAX = originalMax;
    }
    if (originalWindow === undefined) {
      delete process.env.AGENT_RATE_LIMIT_WINDOW_MS;
    } else {
      process.env.AGENT_RATE_LIMIT_WINDOW_MS = originalWindow;
    }
  });

  function createController(prisma: any) {
    return new AgentController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      prisma,
    ) as any;
  }

  it('enforces persisted per-token quota', async () => {
    process.env.AGENT_RATE_LIMIT_MAX = '1';
    process.env.AGENT_RATE_LIMIT_WINDOW_MS = '60000';
    const prisma = {
      agentRequestLog: {
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const controller = createController(prisma);

    await expect(controller.enforceAgentRateLimit('canvas-token')).rejects.toBeInstanceOf(HttpException);
    expect(prisma.agentRequestLog.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tokenHash: expect.any(String),
      }),
    }));
  });

  it('writes audit records without storing the raw Canvas token', async () => {
    const prisma = {
      agentRequestLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };
    const controller = createController(prisma);

    await controller.auditAgentRequest('canvas-token', 'bot-1', 'agent-chat', 'success', 12);

    expect(prisma.agentRequestLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tokenHash: expect.not.stringContaining('canvas-token'),
        botId: 'bot-1',
        action: 'agent-chat',
        status: 'success',
        durationMs: 12,
      }),
    });
  });
});
