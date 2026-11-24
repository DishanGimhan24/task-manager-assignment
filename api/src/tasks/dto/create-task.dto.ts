import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TaskStatus } from '../task.model';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus, { message: 'Status must be TODO, IN_PROGRESS, or DONE' })
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  dueDate?: string;
}