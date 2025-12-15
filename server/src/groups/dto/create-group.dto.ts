import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty({ message: '课程 ID 不能为空' })
  courseId: string;

  @IsString()
  @IsOptional()
  courseName?: string;

  @IsString()
  @IsNotEmpty({ message: '小组名称不能为空' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
