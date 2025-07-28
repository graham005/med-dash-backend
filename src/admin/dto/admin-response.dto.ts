import { ApiProperty } from '@nestjs/swagger';

export class DashboardOverviewDto {
  @ApiProperty({ description: 'Total number of users' })
  totalUsers: number;

  @ApiProperty({ description: 'Number of active users' })
  activeUsers: number;

  @ApiProperty({ description: 'Total revenue amount' })
  totalRevenue: number;

  @ApiProperty({ description: 'Number of successful payments' })
  successfulPayments: number;

  @ApiProperty({ description: 'Payment success rate as percentage' })
  paymentSuccessRate: number;
}

export class AppointmentStatsDto {
  @ApiProperty({ description: 'Total number of appointments' })
  total: number;

  @ApiProperty({ description: 'Number of completed appointments' })
  completed: number;

  @ApiProperty({ description: 'Appointment completion rate as percentage' })
  completionRate: number;
}

export class EmergencyStatsDto {
  @ApiProperty({ description: 'Total number of emergency requests' })
  total: number;

  @ApiProperty({ description: 'Number of active emergency requests' })
  active: number;
}

export class DashboardStatsDto {
  @ApiProperty({ type: DashboardOverviewDto })
  overview: DashboardOverviewDto;

  @ApiProperty({ type: AppointmentStatsDto })
  appointments: AppointmentStatsDto;

  @ApiProperty({ type: EmergencyStatsDto })
  emergency: EmergencyStatsDto;

  @ApiProperty({ 
    type: 'object',
    additionalProperties: { type: 'number' },
    description: 'User count breakdown by role'
  })
  userBreakdown: Record<string, number>;
}

export class ActivityDto {
  @ApiProperty({ description: 'Unique activity identifier' })
  id: string;

  @ApiProperty({ description: 'Type of activity' })
  type: string;

  @ApiProperty({ description: 'Activity message' })
  message: string;

  @ApiProperty({ description: 'Activity timestamp' })
  timestamp: string;

  @ApiProperty({ 
    enum: ['info', 'success', 'warning', 'critical'],
    description: 'Activity severity level'
  })
  severity: 'info' | 'success' | 'warning' | 'critical';

  @ApiProperty({ description: 'Icon identifier for the activity' })
  icon: string;
}

export class SystemAlertDto {
  @ApiProperty({ description: 'Unique alert identifier' })
  id: string;

  @ApiProperty({ description: 'Alert message' })
  message: string;

  @ApiProperty({ 
    enum: ['info', 'warning', 'critical'],
    description: 'Alert severity level'
  })
  severity: 'info' | 'warning' | 'critical';

  @ApiProperty({ description: 'Alert timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Type of alert' })
  type: string;
}

export class UserGrowthDatasetDto {
  @ApiProperty({ description: 'Dataset label' })
  label: string;

  @ApiProperty({ type: [Number], description: 'Data points for the dataset' })
  data: number[];

  @ApiProperty({ description: 'Border color for the dataset' })
  borderColor: string;

  @ApiProperty({ description: 'Background color for the dataset' })
  backgroundColor: string;

  @ApiProperty({ description: 'Line tension value' })
  tension: number;
}

export class UserGrowthSummaryDto {
  @ApiProperty({ description: 'Total new users in the period' })
  totalNewUsers: number;

  @ApiProperty({ description: 'Time period for the data' })
  period: string;
}

export class UserGrowthDto {
  @ApiProperty({ type: [String], description: 'Time period labels' })
  labels: string[];

  @ApiProperty({ type: [UserGrowthDatasetDto], description: 'Chart datasets' })
  datasets: UserGrowthDatasetDto[];

  @ApiProperty({ type: UserGrowthSummaryDto })
  summary: UserGrowthSummaryDto;
}

export class RevenueAnalyticsSummaryDto {
  @ApiProperty({ description: 'Total revenue for the period' })
  totalRevenue: number;

  @ApiProperty({ description: 'Total number of payments' })
  totalPayments: number;

  @ApiProperty({ description: 'Time period for the analytics' })
  period: string;
}

export class RevenueAnalyticsDto {
  @ApiProperty({ type: [String], description: 'Time periods' })
  periods: string[];

  @ApiProperty({ type: [Number], description: 'Revenue amounts per period' })
  revenue: number[];

  @ApiProperty({ type: [Number], description: 'Successful payments per period' })
  successful_payments: number[];

  @ApiProperty({ type: [Number], description: 'Total payments per period' })
  total_payments: number[];

  @ApiProperty({ type: RevenueAnalyticsSummaryDto })
  summary: RevenueAnalyticsSummaryDto;
}