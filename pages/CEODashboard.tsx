import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { db } from '../services/mockDb';
import { Employee, AttendanceType, LeaveStatus, LeaveRequest } from '../types';
import { formatDate, formatTime } from '../services/utils';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface AttendanceSummary {
  employee: Employee;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE';
  checkInTime?: string;
  leaveType?: string;
}

interface PendingLeave extends LeaveRequest {
  employeeName: string;
  employeeAvatar: string;
  department: string;
}

export const CEODashboard: React.FC = () => {
  const [summaryData, setSummaryData] = useState<AttendanceSummary[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    leave: 0
  });
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);

  useEffect(() => {
    refreshDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshDashboard = () => {
      loadDailyData();
      loadPendingLeaves();
      loadWeeklyStats();
  };

  const loadWeeklyStats = () => {
    // Simulate 7 days history based on total employees
    // In a real app, this would query the DB with a date range
    const employeesCount = db.getEmployees().length;
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        
        // Randomize stats for demo purposes
        // Ensure they roughly sum up to total employees
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        
        let present, late, leave, absent;
        
        if (isWeekend) {
             present = Math.floor(Math.random() * 2); 
             late = 0;
             leave = 0;
             absent = employeesCount - present; // Everyone else is technically absent/off
        } else {
             leave = Math.floor(Math.random() * 3);
             late = Math.floor(Math.random() * 4);
             // Ensure reasonable present count
             const maxPresent = employeesCount - leave - late;
             present = Math.max(0, maxPresent - Math.floor(Math.random() * 3));
             absent = employeesCount - present - late - leave;
        }

        data.push({
            name: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
            present,
            late,
            leave,
            absent
        });
    }
    setWeeklyStats(data);
  };

  const loadPendingLeaves = () => {
    const allLeaves = db.getLeaves();
    const employees = db.getEmployees();

    const pending = allLeaves
      .filter(l => l.status === LeaveStatus.PENDING)
      .map(l => {
        const emp = employees.find(e => e.id === l.employeeId);
        return {
          ...l,
          employeeName: emp?.name || 'Unknown',
          employeeAvatar: emp?.avatarUrl || '',
          department: emp?.department || ''
        };
      });
    setPendingLeaves(pending);
  };

  const loadDailyData = () => {
    const employees = db.getEmployees();
    const allAttendance = db.getAllAttendance();
    const allLeaves = db.getLeaves();
    const todayStr = new Date().toDateString();

    // Filter today's check-ins
    const todayCheckIns = allAttendance.filter(a => 
      new Date(a.timestamp).toDateString() === todayStr && 
      a.type === AttendanceType.CHECK_IN
    );

    // Filter active leaves for today
    const activeLeaves = allLeaves.filter(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const today = new Date();
        return l.status === LeaveStatus.APPROVED && today >= start && today <= end;
    });

    let countPresent = 0;
    let countLate = 0;
    let countLeave = 0;
    let countAbsent = 0;

    const summary: AttendanceSummary[] = employees.map(emp => {
      // 1. Check Leave
      const onLeave = activeLeaves.find(l => l.employeeId === emp.id);
      if (onLeave) {
        countLeave++;
        return { employee: emp, status: 'LEAVE', leaveType: onLeave.type };
      }

      // 2. Check Attendance
      const checkIn = todayCheckIns.find(a => a.employeeId === emp.id);
      if (checkIn) {
        const checkInTime = new Date(checkIn.timestamp);
        // Rule: Late after 08:30 AM (Example)
        const isLate = (checkInTime.getHours() * 60 + checkInTime.getMinutes()) > (8 * 60 + 30);
        
        if (isLate) countLate++;
        else countPresent++;

        return { 
          employee: emp, 
          status: isLate ? 'LATE' : 'PRESENT', 
          checkInTime: checkIn.timestamp 
        };
      }

      // 3. Absent (Not scanned yet)
      countAbsent++;
      return { employee: emp, status: 'ABSENT' };
    });

    setSummaryData(summary);
    setStats({
      total: employees.length,
      present: countPresent,
      late: countLate,
      leave: countLeave,
      absent: countAbsent
    });
  };

  const handleApprove = (id: string) => {
    if (window.confirm('ยืนยันการอนุมัติใบลา?')) {
        db.updateLeaveStatus(id, LeaveStatus.APPROVED);
        refreshDashboard();
    }
  };

  const handleReject = (id: string) => {
    if (window.confirm('ยืนยันการปฏิเสธใบลา?')) {
        db.updateLeaveStatus(id, LeaveStatus.REJECTED);
        refreshDashboard();
    }
  };

  const pieData = [
    { name: 'มาปกติ', value: stats.present, color: '#4ADE80' }, // Green
    { name: 'มาสาย', value: stats.late, color: '#FCD34D' },    // Yellow
    { name: 'ลา', value: stats.leave, color: '#60A5FA' },      // Blue
    { name: 'ยังไม่ลงเวลา', value: stats.absent, color: '#F87171' } // Red
  ];

  // Lists
  const scannedList = summaryData.filter(x => x.status === 'PRESENT' || x.status === 'LATE');
  const notScannedList = summaryData.filter(x => x.status === 'ABSENT');
  const leaveList = summaryData.filter(x => x.status === 'LEAVE');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-pastel-text">CEO Dashboard</h1>
            <p className="text-gray-500">ภาพรวมการทำงานประจำวันที่ {formatDate(new Date().toISOString())}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-orange-100">
            <span className="text-sm text-gray-500">พนักงานทั้งหมด</span>
            <span className="ml-2 text-xl font-bold text-pastel-orangeDark">{stats.total}</span>
            <span className="text-sm text-gray-500 ml-1">คน</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <div className="text-3xl font-bold text-green-600">{stats.present}</div>
          <div className="text-sm text-green-800 font-medium">มาปกติ</div>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-100">
          <div className="text-3xl font-bold text-yellow-600">{stats.late}</div>
          <div className="text-sm text-yellow-800 font-medium">มาสาย</div>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="text-3xl font-bold text-blue-600">{stats.leave}</div>
          <div className="text-sm text-blue-800 font-medium">ลา</div>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
          <div className="text-3xl font-bold text-red-500">{stats.absent}</div>
          <div className="text-sm text-red-800 font-medium">ยังไม่ลงเวลา</div>
        </Card>
      </div>

      {/* Pending Approval Section */}
      <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
              <div className="bg-orange-100 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-orange-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-pastel-text">คำขอลาที่รออนุมัติ ({pendingLeaves.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {pendingLeaves.length > 0 ? pendingLeaves.map(req => (
                 <Card key={req.id} className="bg-white border shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                        <img src={req.employeeAvatar} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-100"/>
                        <div>
                            <h3 className="font-semibold text-gray-800 text-sm">{req.employeeName}</h3>
                            <p className="text-xs text-gray-400">{req.department}</p>
                        </div>
                    </div>
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">ประเภท:</span>
                            <span className="font-medium text-orange-600">{req.type}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">วันที่:</span>
                            <span className="text-gray-800">{formatDate(req.startDate)} - {formatDate(req.endDate)}</span>
                        </div>
                         <div className="flex justify-between text-xs">
                            <span className="text-gray-500">จำนวน:</span>
                            <span className="text-gray-800">{req.daysCount} วัน</span>
                        </div>
                        <div className="text-xs bg-gray-50 p-2 rounded text-gray-600 mt-2 line-clamp-2">
                           "{req.reason}"
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="primary" 
                            size="sm" 
                            className="flex-1 bg-green-500 hover:bg-green-600 shadow-green-100"
                            onClick={() => handleApprove(req.id)}
                        >
                            อนุมัติ
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => handleReject(req.id)}
                        >
                            ปฏิเสธ
                        </Button>
                    </div>
                 </Card>
             )) : (
                 <div className="col-span-full text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                     ไม่มีรายการคำขอลาที่รอการตรวจสอบ
                 </div>
             )}
          </div>
      </div>
      
      {/* Weekly Trend Chart */}
      <Card title="แนวโน้มการลงเวลา (7 วันล่าสุด)">
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#4ADE80" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FCD34D" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#FCD34D" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="top" height={36}/>
                    <Area type="monotone" dataKey="present" name="มาปกติ" stackId="1" stroke="#4ADE80" fill="url(#colorPresent)" />
                    <Area type="monotone" dataKey="late" name="มาสาย" stackId="1" stroke="#FCD34D" fill="url(#colorLate)" />
                    <Area type="monotone" dataKey="leave" name="ลา" stackId="1" stroke="#60A5FA" fill="#60A5FA" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="absent" name="ขาด/วันหยุด" stackId="1" stroke="#F87171" fill="#F87171" fillOpacity={0.1} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-1">
            <Card title="สัดส่วนวันนี้" className="h-full min-h-[300px]">
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </Card>
        </div>

        {/* Lists */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Scanned List */}
            <Card title={`✅ ลงเวลาแล้ว (${scannedList.length})`}>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto no-scrollbar">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left">ชื่อ-นามสกุล</th>
                                <th className="px-4 py-2 text-left">แผนก</th>
                                <th className="px-4 py-2 text-center">เวลาเข้า</th>
                                <th className="px-4 py-2 text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {scannedList.length > 0 ? scannedList.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                                        <img src={item.employee.avatarUrl} alt="" className="w-6 h-6 rounded-full"/>
                                        {item.employee.name}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{item.employee.department}</td>
                                    <td className="px-4 py-3 text-center">{item.checkInTime ? formatTime(item.checkInTime) : '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.status === 'LATE' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                            {item.status === 'LATE' ? 'มาสาย' : 'ปกติ'}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="text-center py-4 text-gray-400">ยังไม่มีใครลงเวลา</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Not Scanned List */}
                <Card title={`⚠️ ยังไม่ลงเวลา (${notScannedList.length})`}>
                     <ul className="divide-y divide-gray-100 max-h-[250px] overflow-y-auto no-scrollbar">
                        {notScannedList.length > 0 ? notScannedList.map((item, idx) => (
                            <li key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                                        ?
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm text-gray-700">{item.employee.name}</p>
                                        <p className="text-xs text-gray-400">{item.employee.department}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-red-400 font-medium">ขาดงาน / ยังไม่มา</span>
                            </li>
                        )) : (
                            <li className="text-center py-4 text-gray-400 text-sm">ครบทุกคนแล้ว</li>
                        )}
                     </ul>
                </Card>

                {/* On Leave List */}
                <Card title={`📄 ลางาน (${leaveList.length})`}>
                     <ul className="divide-y divide-gray-100 max-h-[250px] overflow-y-auto no-scrollbar">
                        {leaveList.length > 0 ? leaveList.map((item, idx) => (
                            <li key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <img src={item.employee.avatarUrl} alt="" className="w-8 h-8 rounded-full grayscale opacity-70"/>
                                    <div>
                                        <p className="font-medium text-sm text-gray-700">{item.employee.name}</p>
                                        <p className="text-xs text-blue-400">{item.leaveType}</p>
                                    </div>
                                </div>
                            </li>
                        )) : (
                            <li className="text-center py-4 text-gray-400 text-sm">ไม่มีคนลาวันนี้</li>
                        )}
                     </ul>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
};