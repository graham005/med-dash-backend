import { CANCELLED } from "dns";

export enum UserRole {
    ADMIN = 'admin',
    PATIENT = 'patient',
    DOCTOR = 'doctor',
    PHARMACIST = 'pharmacist',
    PARAMEDIC = 'paramedic'
}

export enum AppointmentStatus {
    BOOKED = 'booked',
    COMPLETED = 'completed',
    CONFIRMED = 'confirmed',
    CANCELLED = 'cancelled',
    NOSHOW = 'no_show'
}

export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PROCESSING = 'processing',
    READY = 'ready',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

export enum ConsultationStatus {
    SCHEDULED = 'scheduled',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

export enum SlotType {
    STANDARD = 'standard',
    EMERGENCY = 'emergency',
    CONSULTATION = 'consultation'
}

export enum UserStatus {
    ACTIVE = 'active',
    PENDING = 'pending',
    SUSPENDED = 'suspended'
}

export enum EMSStatus {
    PENDING = 'pending',
    ENROUTE = 'enroute',
    ARRIVED = 'arrived',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum EmergencyType {
  CARDIAC = 'cardiac',
  RESPIRATORY = 'respiratory',
  TRAUMA = 'trauma',
  STROKE = 'stroke',
  OVERDOSE = 'overdose',
  ALLERGIC_REACTION = 'allergic_reaction',
  MENTAL_HEALTH = 'mental_health',
  ACCIDENT = 'accident',
  FALL = 'fall',
  BURN = 'burn',
  OTHER = 'other'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}