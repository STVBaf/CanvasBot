import { BadGatewayException, Injectable, Logger, PayloadTooLargeException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CanvasService {
	private baseUrl: string;
	private readonly logger = new Logger(CanvasService.name);

	constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
		const url = this.config.get<string>('CANVAS_BASE_URL') ?? '';
		this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
	}

	async getUserProfile(accessToken: string) {
		try {
			const res = await axios.get(`${this.baseUrl}/api/v1/users/self`, {
				headers: { Authorization: `Bearer ${accessToken}` },
				timeout: 30000,
			});
			return res.data as {
				id?: string;
				name?: string;
				primary_email?: string;
				login_id?: string;
				avatar_url?: string;
			};
		} catch (error) {
			throw this.toCanvasHttpException(error, '获取 Canvas 用户信息失败');
		}
	}

	private async getPaginated<T = any>(
		url: string,
		config: {
			headers?: Record<string, string>;
			params?: Record<string, any>;
			timeout?: number;
		} = {},
	): Promise<T[]> {
		const items: T[] = [];
		let nextUrl: string | null = url;
		let params = config.params;

		while (nextUrl) {
			const res = await axios.get(nextUrl, {
				...config,
				timeout: config.timeout ?? 30000,
				params,
			});
			const data = Array.isArray(res.data) ? res.data : [res.data];
			items.push(...data);
			nextUrl = this.getNextLink(res.headers.link);
			params = undefined;
		}

		return items;
	}

	private getNextLink(linkHeader?: string): string | null {
		if (!linkHeader) return null;

		const nextPart = linkHeader
			.split(',')
			.map(part => part.trim())
			.find(part => part.includes('rel="next"'));

		const match = nextPart?.match(/<([^>]+)>/);
		return match?.[1] ?? null;
	}

	private toCanvasHttpException(error: unknown, fallback: string): Error {
		if (!axios.isAxiosError(error)) {
			return error as Error;
		}

		const status = error.response?.status;
		if (status === 401 || status === 403) {
			return new UnauthorizedException('Canvas token 无效或权限不足');
		}
		if (status) {
			return new BadGatewayException(`${fallback}: Canvas API ${status}`);
		}
		return new ServiceUnavailableException(`${fallback}: ${error.message}`);
	}

	getAuthorizeUrl(state: string) {
		const clientId = this.config.get<string>('CANVAS_CLIENT_ID');
		const redirectUri = this.config.get<string>('CANVAS_REDIRECT_URI');
		const authorizePath = this.config.get<string>('CANVAS_OAUTH_AUTHORIZE_PATH');

		const url = new URL(authorizePath ?? '/login/oauth2/auth', this.baseUrl);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('client_id', clientId ?? '');
		url.searchParams.set('redirect_uri', redirectUri ?? '');
		url.searchParams.set('state', state);
		return url.toString();
	}

	async exchangeToken(code: string) {
		const tokenPath = this.config.get<string>('CANVAS_OAUTH_TOKEN_PATH') ?? '/login/oauth2/token';
		const clientId = this.config.get<string>('CANVAS_CLIENT_ID') ?? '';
		const clientSecret = this.config.get<string>('CANVAS_CLIENT_SECRET') ?? '';
		const redirectUri = this.config.get<string>('CANVAS_REDIRECT_URI') ?? '';

		const url = new URL(tokenPath, this.baseUrl).toString();

		const res = await axios.post(
			url,
			new URLSearchParams({
				grant_type: 'authorization_code',
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				code,
			}),
			{
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			},
		);

		return res.data as {
			access_token: string;
			refresh_token?: string;
			expires_in?: number;
			token_type: string;
			user?: any;
		};
	}

	async refreshToken(refreshToken: string) {
		const tokenPath = this.config.get<string>('CANVAS_OAUTH_TOKEN_PATH') ?? '/login/oauth2/token';
		const clientId = this.config.get<string>('CANVAS_CLIENT_ID') ?? '';
		const clientSecret = this.config.get<string>('CANVAS_CLIENT_SECRET') ?? '';

		const url = new URL(tokenPath, this.baseUrl).toString();
		const res = await axios.post(
			url,
			new URLSearchParams({
				grant_type: 'refresh_token',
				client_id: clientId,
				client_secret: clientSecret,
				refresh_token: refreshToken,
			}),
			{
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			},
		);
		return res.data as {
			access_token: string;
			refresh_token?: string;
			expires_in?: number;
			token_type: string;
			user?: any;
		};
	}

	async getAccessTokenForUser(userId: string) {
		const token = await this.prisma.token.findFirst({
			where: { userId, provider: 'canvas' },
			orderBy: { createdAt: 'desc' },
		});
		if (!token) {
			throw new UnauthorizedException('No Canvas token');
		}
		// 手动生成的 token 是长期有效的，直接返回
		// 如果 expiresAt 为 null，表示是手动 token
		if (!token.expiresAt || token.expiresAt > new Date()) {
			return token.accessToken;
		}
		// 如果 token 已过期且没有 refresh token，抛出异常
		// 注意：手动 token 通常不会过期，这里主要是为了兼容未来可能的 OAuth2
		throw new UnauthorizedException('Canvas token expired. Please login again with a valid access token.');
	}

	async getCourses(accessToken: string) {
		const url = `${this.baseUrl}/api/v1/courses`;
		const cleanToken = accessToken.trim();

		this.logger.log(`正在从 Canvas 获取课程列表: ${url}`);

		try {
			const courses = await this.getPaginated(url, {
				headers: { Authorization: `Bearer ${cleanToken}` },
				params: {
					enrollment_state: 'active',  // 只获取激活的课程
					per_page: 100,                // 每页100条（Canvas最大值）
					include: ['term']             // 包含学期信息
				},
				timeout: 30000, // 30秒超时
			});
			this.logger.log(`成功获取 ${courses.length} 门课程`);
			return courses;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(`Failed to fetch courses: ${error.response?.status} - ${error.message}`);
			}
			throw this.toCanvasHttpException(error, '获取课程列表失败');
		}
	}

	/**
	 * 获取课程文件列表（直接从 Canvas 获取，不存储到数据库）
	 */
	async getCourseFiles(accessToken: string, courseId: string) {
		const cleanToken = accessToken.trim();
		
		try {
			const files = await this.getPaginated(`${this.baseUrl}/api/v1/courses/${courseId}/files`, {
				headers: { Authorization: `Bearer ${cleanToken}` },
				params: {
					per_page: 100,  // 每页100个文件
					sort: 'created_at',
					order: 'desc',
				}
			});
			
			this.logger.log(`Successfully fetched ${files.length} files from course ${courseId}`);
			return files;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(`Failed to fetch course files: ${error.response?.status} - ${error.message}`);
			}
			throw this.toCanvasHttpException(error, `获取课程 ${courseId} 文件失败`);
		}
	}

	/**
	 * 获取课程大纲（syllabus）
	 * Canvas API: GET /api/v1/courses/:courseId?include[]=syllabus_body
	 */
	async getCourseSyllabus(accessToken: string, courseId: string) {
		const cleanToken = accessToken.trim();
		this.logger.log(`正在获取课程 ${courseId} 的大纲...`);
		try {
			const res = await axios.get(`${this.baseUrl}/api/v1/courses/${courseId}`, {
				headers: { Authorization: `Bearer ${cleanToken}` },
				params: {
					include: ['syllabus_body'],
				},
				timeout: 15000,
			});

			const rawHtml: string = res.data?.syllabus_body || '';
			this.logger.log(`课程 ${courseId} 大纲获取成功，HTML长度: ${rawHtml.length}`);
			const cleanText = rawHtml
				.replace(/<br\s*\/?>(?=\s*\n?)/gi, '\n')
				.replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
				.replace(/<[^>]+>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();

			// 提取大纲中引用的文件ID，便于上层获取文件信息
			const fileIdMatches = Array.from(rawHtml.matchAll(/\/files\/(\d+)/g)).map(m => m[1]);
			const uniqueFileIds = Array.from(new Set(fileIdMatches)).slice(0, 5); // 最多取前5个
			const fileMetas: Array<{ id: string; name: string; url?: string }> = [];
			for (const fileId of uniqueFileIds) {
				try {
					const info = await this.getFileInfo(accessToken, fileId);
					fileMetas.push({
						id: String(fileId),
						name: info.display_name || info.filename || `file_${fileId}`,
						url: info.url,
					});
				} catch (err) {
					this.logger.warn(`获取大纲文件信息失败 fileId=${fileId}: ${err}`);
				}
			}

			this.logger.log(`课程 ${courseId} 大纲处理完成 - 纯文本: ${cleanText.length}字符, 引用文件: ${fileMetas.length}个`);
			return {
				rawHtml,
				text: cleanText,
				files: fileMetas,
				courseName: res.data?.name,
				courseCode: res.data?.course_code,
			};
		} catch (error) {
			this.logger.error(`获取课程 ${courseId} 大纲失败: ${error?.message || error}`);
			if (axios.isAxiosError(error)) {
				this.logger.error(`Failed to fetch course syllabus: ${error.response?.status} - ${error.message}`);
			}
			throw this.toCanvasHttpException(error, `获取课程 ${courseId} 大纲失败`);
		}
	}

	/**
	 * 获取单个文件的详细信息
	 */
	async getFileInfo(accessToken: string, fileId: string) {
		const cleanToken = accessToken.trim();
		
		try {
			const res = await axios.get(`${this.baseUrl}/api/v1/files/${fileId}`, {
				headers: { Authorization: `Bearer ${cleanToken}` },
				timeout: 15000,
			});
			return res.data;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(`Failed to fetch file info: ${error.response?.status} - ${error.message}`);
			}
			throw this.toCanvasHttpException(error, `获取文件 ${fileId} 信息失败`);
		}
	}

	/**
	 * 下载文件内容
	 */
	async downloadFile(accessToken: string, fileUrl: string, maxBytes?: number): Promise<Buffer> {
		const cleanToken = accessToken.trim();
		
		try {
			const res = await axios.get(fileUrl, {
				headers: { Authorization: `Bearer ${cleanToken}` },
				responseType: 'arraybuffer',  // 获取二进制数据
				timeout: 120000,
				maxContentLength: maxBytes,
				maxBodyLength: maxBytes,
			});
			const contentLength = Number(res.headers['content-length']);
			if (maxBytes && Number.isFinite(contentLength) && contentLength > maxBytes) {
				throw new PayloadTooLargeException(`Canvas 文件超过下载上限 (${contentLength} > ${maxBytes})`);
			}
			if (maxBytes && Buffer.byteLength(res.data) > maxBytes) {
				throw new PayloadTooLargeException(`Canvas 文件超过下载上限 (${Buffer.byteLength(res.data)} > ${maxBytes})`);
			}
			return Buffer.from(res.data);
		} catch (error) {
			if (error instanceof PayloadTooLargeException) {
				throw error;
			}
			if (axios.isAxiosError(error)) {
				this.logger.error(`Failed to download file: ${error.response?.status} - ${error.message}`);
			}
			throw this.toCanvasHttpException(error, '下载 Canvas 文件失败');
		}
	}

	async downloadFileStream(accessToken: string, fileUrl: string, maxBytes?: number) {
		const cleanToken = accessToken.trim();

		try {
			const res = await axios.get(fileUrl, {
				headers: { Authorization: `Bearer ${cleanToken}` },
				responseType: 'stream',
				timeout: 120000,
				maxBodyLength: maxBytes,
			});
			const contentLength = Number(res.headers['content-length']);
			if (maxBytes && Number.isFinite(contentLength) && contentLength > maxBytes) {
				res.data.destroy();
				throw new PayloadTooLargeException(`Canvas 文件超过下载上限 (${contentLength} > ${maxBytes})`);
			}
			return res;
		} catch (error) {
			if (error instanceof PayloadTooLargeException) {
				throw error;
			}
			if (axios.isAxiosError(error)) {
				this.logger.error(`Failed to open file stream: ${error.response?.status} - ${error.message}`);
			}
			throw this.toCanvasHttpException(error, '打开 Canvas 文件下载流失败');
		}
	}

	/**
	 * 获取课程的作业列表
	 */
	async getCourseAssignments(accessToken: string, courseId: string) {
		const cleanToken = accessToken.trim();
		
		try {
			const assignments = await this.getPaginated(`${this.baseUrl}/api/v1/courses/${courseId}/assignments`, {
				headers: { Authorization: `Bearer ${cleanToken}` },
				params: {
					per_page: 100,
					order_by: 'due_at',
					include: ['submission']  // 包含提交状态
				},
				timeout: 15000,
			});
			
			this.logger.log(`Successfully fetched ${assignments.length} assignments from course ${courseId}`);
			return assignments;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(`Failed to fetch assignments: ${error.response?.status} - ${error.message}`);
			}
			throw this.toCanvasHttpException(error, `获取课程 ${courseId} 作业失败`);
		}
	}

	/**
	 * 获取即将到期的作业（所有课程）
	 */
	async getUpcomingAssignments(accessToken: string) {
		const cleanToken = accessToken.trim();
		
		try {
			const events = await this.getPaginated(`${this.baseUrl}/api/v1/users/self/upcoming_events`, {
				headers: { Authorization: `Bearer ${cleanToken}` },
				timeout: 15000,
			});
			
			// 过滤出作业类型的事件
			const assignments = events.filter((event: any) => event.type === 'assignment');
			this.logger.log(`Successfully fetched ${assignments.length} upcoming assignments`);
			return assignments;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(`Failed to fetch upcoming assignments: ${error.response?.status} - ${error.message}`);
			}
			throw this.toCanvasHttpException(error, '获取即将到期作业失败');
		}
	}

	/**
	 * 获取单个作业的详细信息
	 */
	async getAssignmentDetail(accessToken: string, courseId: string, assignmentId: string) {
		const cleanToken = accessToken.trim();
		
		try {
			const res = await axios.get(
				`${this.baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}`,
				{
					headers: { Authorization: `Bearer ${cleanToken}` },
					params: {
						include: ['submission']
					},
					timeout: 15000,
				}
			);
			return res.data;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(`Failed to fetch assignment detail: ${error.response?.status} - ${error.message}`);
			}
			throw this.toCanvasHttpException(error, `获取作业 ${assignmentId} 详情失败`);
		}
	}
}

