import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { CanvasModule } from '../canvas/canvas.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [CanvasModule, AssignmentsModule, FilesModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}