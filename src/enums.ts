export enum UserRole {
    ADMIN = 'admin',
    PATIENT = 'patient',
    DOCTOR = 'doctor',
    PHARMACIST = 'pharmacist',
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
    FULFILLED = 'fulfilled',
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