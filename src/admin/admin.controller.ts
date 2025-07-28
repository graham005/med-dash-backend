import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../enums';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { 
  DashboardStatsDto, 
  ActivityDto, 
  SystemAlertDto, 
  UserGrowthDto, 
  RevenueAnalyticsDto 
} from './dto/admin-response.dto';

@ApiTags('Admin Analytics')
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsDto
  })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.adminService.getDashboardStats();
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'Get recent system activities' })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Maximum number of activities to return (default: 10)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Recent activities retrieved successfully',
    type: [ActivityDto]
  })
  async getRecentActivities(@Query('limit') limit?: number): Promise<ActivityDto[]> {
    return this.adminService.getRecentActivities(limit || 10);
  }

  @Get('system-alerts')
  @ApiOperation({ summary: 'Get system alerts' })
  @ApiResponse({ 
    status: 200, 
    description: 'System alerts retrieved successfully',
    type: [SystemAlertDto]
  })
  async getSystemAlerts(): Promise<SystemAlertDto[]> {
    return this.adminService.getSystemAlerts();
  }

  @Get('user-growth')
  @ApiOperation({ summary: 'Get user growth data' })
  @ApiQuery({ 
    name: 'period', 
    required: false, 
    enum: ['7days', '30days', '6months'], 
    description: 'Time period for user growth data (default: 6months)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User growth data retrieved successfully',
    type: UserGrowthDto
  })
  async getUserGrowth(@Query('period') period?: string): Promise<UserGrowthDto> {
    return this.adminService.getUserGrowth(period || '6months');
  }

  @Get('revenue-analytics')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ 
    name: 'period', 
    required: false, 
    enum: ['week', 'month', 'year'], 
    description: 'Time period for revenue analytics (default: month)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Revenue analytics retrieved successfully',
    type: RevenueAnalyticsDto
  })
  async getRevenueAnalytics(@Query('period') period?: string): Promise<RevenueAnalyticsDto> {
    return this.adminService.getRevenueAnalytics(period || 'month');
  }
}
