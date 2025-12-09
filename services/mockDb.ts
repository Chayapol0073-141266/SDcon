import { AppConfig, AttendanceRecord, Employee, LeaveRequest, LeaveStatus, Role } from '../types';

// Mock Data
const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'E001',
    username: 'emp01',
    password: 'password',
    name: 'Somchai Jaidee',
    role: Role.EMP,
    department: 'IT',
    avatarUrl: 'https://placehold.co/150x150/orange/white?text=SJ',
    startDate: '2023-01-15'
  },
  {
    id: 'E002',
    username: 'emp02',
    password: 'password',
    name: 'Somsri Rakngan',
    role: Role.EMP,
    department: 'Marketing',
    avatarUrl: 'https://placehold.co/150x150/pink/white?text=SR',
    startDate: '2022-05-20'
  },
  {
    id: 'M001',
    username: 'admin',
    password: 'password',
    name: 'Wichai Manager',
    role: Role.ADMIN,
    department: 'HR',
    avatarUrl: 'https://placehold.co/150x150/blue/white?text=WM',
    startDate: '2020-01-10'
  },
  {
    id: 'C001',
    username: 'ceo',
    password: 'password',
    name: 'Boss Big',
    role: Role.CEO,
    department: 'Executive',
    avatarUrl: 'https://placehold.co/150x150/black/white?text=BB',
    startDate: '2019-01-01'
  }
];

const MOCK_ATTENDANCE: AttendanceRecord[] = [];
const MOCK_LEAVES: LeaveRequest[] = [];

const MOCK_CONFIG: AppConfig = {
  centerLat: 13.7563, // Bangkok center example
  centerLng: 100.5018,
  radiusKm: 0.5,
  googleSheetId: 'dummy-sheet-id'
};

class MockDatabase {
  private employees: Employee[] = [...MOCK_EMPLOYEES];
  private attendance: AttendanceRecord[] = [...MOCK_ATTENDANCE];
  private leaves: LeaveRequest[] = [...MOCK_LEAVES];
  private config: AppConfig = { ...MOCK_CONFIG };

  login(username: string, password?: string): Employee | undefined {
    return this.employees.find(e => e.username === username && (password ? e.password === password : true));
  }

  getEmployees(): Employee[] {
    return this.employees;
  }

  getAllAttendance(): AttendanceRecord[] {
    return this.attendance;
  }

  getAttendanceHistory(employeeId: string): AttendanceRecord[] {
    return this.attendance
      .filter(a => a.employeeId === employeeId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getLeaves(employeeId?: string): LeaveRequest[] {
    if (employeeId) {
      return this.leaves.filter(l => l.employeeId === employeeId);
    }
    return this.leaves;
  }

  addAttendance(record: AttendanceRecord): void {
    this.attendance.push(record);
  }

  addLeaveRequest(request: LeaveRequest): void {
    this.leaves.push(request);
  }

  updateLeaveStatus(id: string, status: LeaveStatus, approverId?: string): void {
    const leave = this.leaves.find(l => l.id === id);
    if (leave) {
      leave.status = status;
      if (approverId) leave.approverId = approverId;
    }
  }

  getConfig(): AppConfig {
    return this.config;
  }
}

export const db = new MockDatabase();
