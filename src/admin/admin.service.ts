import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { EMSRequest } from '../ems/entities/ems.entity';
import { AppointmentStatus, EMSStatus, Priority, UserRole, UserStatus } from '../enums';
import { 
  DashboardStatsDto, 
  ActivityDto, 
  SystemAlertDto, 
  UserGrowthDto, 
  RevenueAnalyticsDto 
} from './dto/admin-response.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Payment) private paymentRepository: Repository<Payment>,
    @InjectRepository(Appointment) private appointmentRepository: Repository<Appointment>,
    @InjectRepository(EMSRequest) private emsRepository: Repository<EMSRequest>,
  ) {}

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [
      totalUsers,
      activeUsers,
      totalPayments,
      successfulPayments,
      totalAppointments,
      completedAppointments,
      totalEMSRequests,
      activeEMSRequests,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { userStatus: UserStatus.ACTIVE } }),
      this.paymentRepository.count(),
      this.paymentRepository.count({ where: { status: PaymentStatus.SUCCESS } }),
      this.appointmentRepository.count(),
      this.appointmentRepository.count({ where: { status: AppointmentStatus.COMPLETED } }),
      this.emsRepository.count(),
      this.emsRepository.count({ where: { status: EMSStatus.PENDING } }),
    ]);

    // Calculate total revenue
    const revenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: 'success' })
      .getRawOne();

    const totalRevenue = parseFloat(revenueResult?.total || '0');

    // Calculate user breakdown by role
    const usersByRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.userRole', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.userRole')
      .getRawMany();

    return {
      overview: {
        totalUsers,
        activeUsers,
        totalRevenue,
        successfulPayments,
        paymentSuccessRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
      },
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
      },
      emergency: {
        total: totalEMSRequests,
        active: activeEMSRequests,
      },
      userBreakdown: usersByRole.reduce((acc, item) => {
        acc[item.role] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  async getRecentActivities(limit: number = 10): Promise<ActivityDto[]> {
    const activities: ActivityDto[] = [];

    // Recent user registrations
    const recentUsers = await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      select: ['id', 'firstName', 'lastName', 'userRole', 'createdAt'],
    });

    recentUsers.forEach(user => {
      activities.push({
        id: `user-${user.id}`,
        type: 'user_registration',
        message: `New ${user.userRole} registered: ${user.firstName} ${user.lastName}`,
        timestamp: user.createdAt.toISOString(),
        severity: 'info',
        icon: 'user',
      });
    });

    // Recent successful payments
    const recentPayments = await this.paymentRepository.find({
      where: { status: PaymentStatus.SUCCESS },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
      select: ['id', 'amount', 'createdAt'],
    });

    recentPayments.forEach(payment => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment_success',
        message: `Payment processed: KES ${payment.amount} from ${payment.user?.firstName || 'User'}`,
        timestamp: payment.createdAt.toISOString(),
        severity: 'success',
        icon: 'check',
      });
    });

    // Recent EMS requests
    const recentEMS = await this.emsRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['patient'],
      select: ['id', 'emergencyType', 'priority', 'createdAt'],
    });

    recentEMS.forEach(ems => {
      activities.push({
        id: `ems-${ems.id}`,
        type: 'emergency_request',
        message: `Emergency request: ${ems.emergencyType} (${ems.priority} priority)`,
        timestamp: ems.createdAt.toISOString(),
        severity: ems.priority === 'critical' ? 'critical' : 'warning',
        icon: 'alert',
      });
    });

    // Sort by timestamp and return limited results
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getSystemAlerts(): Promise<SystemAlertDto[]> {
    const alerts: SystemAlertDto[] = [];

    // Check for failed payments in last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedPayments = await this.paymentRepository.count({
      where: {
        status: PaymentStatus.FAILED,
        createdAt: Between(yesterday, new Date()),
      },
    });

    if (failedPayments > 5) {
      alerts.push({
        id: 'payment-failures',
        message: `${failedPayments} payment failures in the last 24 hours`,
        severity: 'critical',
        timestamp: new Date().toISOString(),
        type: 'payment_issue',
      });
    }

    // Check for critical EMS requests without paramedics
    const unassignedCriticalEMS = await this.emsRepository.count({
      where: {
        priority: Priority.CRITICAL,
        paramedic: require('typeorm').IsNull(),
        status: EMSStatus.PENDING,
      },
    });

    if (unassignedCriticalEMS > 0) {
      alerts.push({
        id: 'critical-ems',
        message: `${unassignedCriticalEMS} critical emergency requests need immediate attention`,
        severity: 'critical',
        timestamp: new Date().toISOString(),
        type: 'emergency_alert',
      });
    }

    // Check for suspended users trying to access system
    const suspendedUsers = await this.userRepository.count({
      where: { userStatus: UserStatus.SUSPENDED },
    });

    if (suspendedUsers > 10) {
      alerts.push({
        id: 'suspended-users',
        message: `${suspendedUsers} suspended users may need review`,
        severity: 'warning',
        timestamp: new Date().toISOString(),
        type: 'user_management',
      });
    }

    return alerts;
  }

  async getUserGrowth(period: string): Promise<UserGrowthDto> {
    const endDate = new Date();
    let startDate: Date;
    let groupBy: string;

    switch (period) {
      case '7days':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'to_char(user.createdAt, \'YYYY-MM-DD\')'; // PostgreSQL format
        break;
      case '30days':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'to_char(user.createdAt, \'YYYY-MM-DD\')'; // PostgreSQL format
        break;
      case '6months':
      default:
        startDate = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
        groupBy = 'to_char(user.createdAt, \'YYYY-MM\')'; // PostgreSQL format
        break;
    }

    const userGrowth = await this.userRepository
      .createQueryBuilder('user')
      .select(`${groupBy}`, 'period')
      .addSelect('COUNT(*)', 'count')
      .addSelect('user.userRole', 'role')
      .where('user.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('period, user.userRole')
      .orderBy('period', 'ASC')
      .getRawMany();

    // Process data for chart format
    const periods = [...new Set(userGrowth.map(item => item.period))];
    const roles = [UserRole.PATIENT, UserRole.DOCTOR, UserRole.PHARMACIST, UserRole.ADMIN, UserRole.PARAMEDIC];

    const datasets = roles.map(role => ({
      label: role.charAt(0).toUpperCase() + role.slice(1),
      data: periods.map(period => {
        const item = userGrowth.find(g => g.period === period && g.role === role);
        return parseInt(item?.count || '0');
      }),
      borderColor: this.getRoleColor(role),
      backgroundColor: this.getRoleColor(role, 0.2),
      tension: 0.4,
    }));

    return {
      labels: periods,
      datasets,
      summary: {
        totalNewUsers: userGrowth.reduce((sum, item) => sum + parseInt(item.count), 0),
        period,
      },
    };
  }

  async getRevenueAnalytics(period: string): Promise<RevenueAnalyticsDto> {
    const endDate = new Date();
    let startDate: Date;
    let groupBy: string;

    switch (period) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'DATE(payment.createdAt)';
        break;
      case 'month':
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'DATE(payment.createdAt)';
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        groupBy = 'DATE_FORMAT(payment.createdAt, "%Y-%m")';
        break;
    }

    const revenueData = await this.paymentRepository
      .createQueryBuilder('payment')
      .select(`${groupBy}`, 'period')
      .addSelect('SUM(CASE WHEN payment.status = "success" THEN payment.amount ELSE 0 END)', 'revenue')
      .addSelect('COUNT(CASE WHEN payment.status = "success" THEN 1 END)', 'successful_payments')
      .addSelect('COUNT(*)', 'total_payments')
      .where('payment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return {
      periods: revenueData.map(item => item.period),
      revenue: revenueData.map(item => parseFloat(item.revenue || '0')),
      successful_payments: revenueData.map(item => parseInt(item.successful_payments || '0')),
      total_payments: revenueData.map(item => parseInt(item.total_payments || '0')),
      summary: {
        totalRevenue: revenueData.reduce((sum, item) => sum + parseFloat(item.revenue || '0'), 0),
        totalPayments: revenueData.reduce((sum, item) => sum + parseInt(item.total_payments || '0'), 0),
        period,
      },
    };
  }

  private getRoleColor(role: UserRole, alpha: number = 1): string {
    const colors = {
      [UserRole.PATIENT]: `rgba(59, 130, 246, ${alpha})`, // Blue
      [UserRole.DOCTOR]: `rgba(16, 185, 129, ${alpha})`, // Green
      [UserRole.PHARMACIST]: `rgba(245, 158, 11, ${alpha})`, // Amber
      [UserRole.ADMIN]: `rgba(239, 68, 68, ${alpha})`, // Red
      [UserRole.PARAMEDIC]: `rgba(139, 92, 246, ${alpha})`, // Purple
    };
    return colors[role] || `rgba(107, 114, 128, ${alpha})`;
  }
}
