import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CanvasModule } from '../canvas/canvas.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
	imports: [
		CanvasModule,
		PrismaModule,
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => {
				const secret = config.get<string>('JWT_SECRET');
				if (process.env.NODE_ENV === 'production' && !secret) {
					throw new Error('JWT_SECRET is required in production');
				}

				return {
					secret: secret ?? 'dev-only-change-me',
					signOptions: { expiresIn: '7d' },
				};
			},
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, JwtAuthGuard],
	exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}

