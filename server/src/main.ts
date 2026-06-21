import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
	const logger = new Logger('Bootstrap');
	const app = await NestFactory.create(AppModule);
	app.setGlobalPrefix('api');
	
	// 启用 CORS 支持前端调用
	const allowedOrigins = [
		'http://localhost:3000',
		'http://localhost:3001', 
		'http://localhost:3002',
		'http://localhost:5173',
		'http://127.0.0.1:3000',
		'http://127.0.0.1:3001',
		'http://127.0.0.1:5173',
	];
	
	// 从环境变量读取额外的允许域名（逗号分隔）
	const extraOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(o => o) || [];
	const allOrigins = [...allowedOrigins, ...extraOrigins];
	
	logger.log(`CORS允许的域名: ${allOrigins.join(', ')}`);
	
	app.enableCors({
		origin: (origin, callback) => {
			// 允许无 origin 的请求（如 Postman、移动应用等）
			if (!origin) {
				callback(null, true);
				return;
			}
			
			// 检查是否在白名单中
			if (allOrigins.includes(origin)) {
				callback(null, true);
			} else {
				logger.warn(`CORS阻止了来自 ${origin} 的请求`);
				const allowUnlistedDevOrigins =
					process.env.NODE_ENV !== 'production' &&
					process.env.ALLOW_UNLISTED_DEV_ORIGINS === 'true';
				callback(null, allowUnlistedDevOrigins);
			}
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	});
	
	// 添加请求日志（生产环境可通过环境变量控制）
	if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
		app.use((req: any, res: any, next: any) => {
			logger.log(`${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
			next();
		});
	}

	app.useGlobalPipes(new ValidationPipe({
		transform: true,
		whitelist: true,
	}));
	await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
	logger.log(`Listening on http://localhost:${process.env.PORT ?? 3000}/api`);
}

bootstrap();

