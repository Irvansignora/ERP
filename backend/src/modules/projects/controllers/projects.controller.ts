import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  getAllProjects(@Query() query: any) { return this.projectsService.getAllProjects(query); }

  @Get('summary')
  getProjectSummary() { return this.projectsService.getProjectSummary(); }

  @Get(':id')
  getProjectById(@Param('id') id: string) { return this.projectsService.getProjectById(id); }

  @Post()
  createProject(@Body() body: any) { return this.projectsService.createProject(body); }

  @Patch(':id/status')
  updateProjectStatus(@Param('id') id: string, @Body() body: any) {
    return this.projectsService.updateProjectStatus(id, body.status);
  }

  @Post('tasks')
  createTask(@Body() body: any) { return this.projectsService.createTask(body); }

  @Patch('tasks/:id/status')
  updateTaskStatus(@Param('id') id: string, @Body() body: any) {
    return this.projectsService.updateTaskStatus(id, body.status);
  }
}
