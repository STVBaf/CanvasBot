import { Test } from '@nestjs/testing';
import { AuthModule } from './auth.module';

describe('AuthModule JWT configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('fails fast in production when JWT_SECRET is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    await expect(Test.createTestingModule({
      imports: [AuthModule],
    }).compile()).rejects.toThrow('JWT_SECRET is required in production');
  });
});
