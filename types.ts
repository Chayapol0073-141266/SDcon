export enum Role {
  EMP = 'EMP',
  ADMIN = 'ADMIN',
  FM = 'FM',
  SUP = 'SUP',
  OM = 'OM',
  PM = 'PM',
  CEO = 'CEO',
  DM = 'DM'
}

export interface Employee {
  id: string;
  username: string; // Changed from email to username
  password?: string; // Added for auth simulation
  name: string;
  role: Role;
  department: string;
  avatarUrl?: string;
  startDate: string; // Added for tenure calculation
}

export enum AttendanceType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT'
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  timestamp: string; // ISO string
  type: AttendanceType;
  location: {
    lat: number;
    lng: number;
    inOffice: boolean;
  };
  note?: string;
  imageUrl?: string; // For off-site verification
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum LeaveTypeCategory {
  SICK = 'SICK', // ลาป่วย
  PERSONAL = 'PERSONAL', // ลากิจ
  ANNUAL = 'ANNUAL', // พักร้อน
  MATERNITY = 'MATERNITY', // คลอดบุตร
  STERILIZATION = 'STERILIZATION', // ทำหมัน
  TRAINING = 'TRAINING', // ฝึกอบรม
  MILITARY = 'MILITARY' // ทหาร
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveTypeCategory;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  approverId?: string; // Next approver in chain
  attachmentUrl?: string; // For medical certs etc.
  daysCount: number;
}

export interface AppConfig {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  googleSheetId: string;
}