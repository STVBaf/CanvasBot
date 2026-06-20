import { NotFoundException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController development routes', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('hides test-token in production', async () => {
    process.env.NODE_ENV = 'production';
    const auth = { getTestToken: jest.fn() } as any;
    const controller = new AuthController(auth);

    await expect(controller.testToken()).rejects.toBeInstanceOf(NotFoundException);
    expect(auth.getTestToken).not.toHaveBeenCalled();
  });

  it('allows test-token outside production', async () => {
    process.env.NODE_ENV = 'development';
    const auth = { getTestToken: jest.fn().mockResolvedValue({ userId: 'u1' }) } as any;
    const controller = new AuthController(auth);

    await expect(controller.testToken('u@example.com')).resolves.toEqual({ userId: 'u1' });
    expect(auth.getTestToken).toHaveBeenCalledWith('u@example.com', undefined);
  });
});
