import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { db } from '../services/mockDb';
import { generateHRInsights } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AttendanceType, LeaveStatus } from '../types';

export const AdminDashboard: React.FC = () => {
  const [insight, setInsight] = useState<string>('กำลังวิเคราะห์ข้อมูลโดย AI...');
  const [loadingAI, setLoadingAI] = useState(true);
  
  // State for Charts
  const [deptStats, setDeptStats] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    presentTotal: 0,
    late: 0,
    leave: 0,
    total: 0
  });

  const COLORS = ['#FFB347', '#FF9E6F', '#60A5FA', '#E0E0E0']; // Matches Pie Chart order

  useEffect(() => {
    calculateStats();
    fetchInsight();
  }, []);

  const calculateStats = () => {
    const employees = db.getEmployees();
    const attendance = db.getAllAttendance();
    const leaves = db.getLeaves();
    const todayStr = new Date().toDateString();

    // 1. Get Approved Leaves for Today
    const activeLeaves = leaves.filter(l => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const today = new Date();
      // Normalize times for comparison if needed, but simple date comparison often suffices for day granularity
      // Let's ensure strict date coverage
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      return l.status === LeaveStatus.APPROVED && today >= start && today <= end;
    });

    // 2. Get Today's Check-ins
    const todayCheckIns = attendance.filter(a => 
      new Date(a.timestamp).toDateString() === todayStr && 
      a.type === AttendanceType.CHECK_IN
    );

    // 3. Aggregate by Department
    const departments = Array.from(new Set(employees.map(e => e.department)));
    
    const statsByDept = departments.map(dept => {
      const empInDept = employees.filter(e => e.department === dept);
      let present = 0;
      let late = 0;
      let absent = 0;
      let leave = 0;

      empInDept.forEach(emp => {
        // Priority: Leave > Check-in > Absent
        const isLeave = activeLeaves.find(l => l.employeeId === emp.id);
        
        if (isLeave) {
          leave++;
        } else {
          const checkIn = todayCheckIns.find(a => a.employeeId === emp.id);
          if (checkIn) {
            const checkInTime = new Date(checkIn.timestamp);
            // Late rule: > 08:30 AM
            const isLate = (checkInTime.getHours() * 60 + checkInTime.getMinutes()) > (8 * 60 + 30);
            if (isLate) {
              late++;
            } else {
              present++;
            }
          } else {
            absent++;
          }
        }
      });

      return { name: dept, present, late, absent, leave };
    });

    setDeptStats(statsByDept);

    // 4. Calculate Totals
    const totalPresent = statsByDept.reduce((acc, curr) => acc + curr.present, 0);
    const totalLate = statsByDept.reduce((acc, curr) => acc + curr.late, 0);
    const totalLeave = statsByDept.reduce((acc, curr) => acc + curr.leave, 0);
    const totalAbsent = statsByDept.reduce((acc, curr) => acc + curr.absent, 0);

    setSummary({
      presentTotal: totalPresent + totalLate, // Present includes late for the big number
      late: totalLate,
      leave: totalLeave,
      total: employees.length
    });

    setDailyStats([
      { name: 'มาปกติ', value: totalPresent },
      { name: 'สาย', value: totalLate },
      { name: 'ลา', value: totalLeave },
      { name: 'ขาด/ยังไม่มา', value: totalAbsent },
    ]);
  };

  const fetchInsight = async () => {
    // In a real scenario, check if API Key exists before calling
    if (!process.env.API_KEY) {
        setInsight("ไม่พบ Gemini API Key กรุณาตั้งค่า .env เพื่อใช้งาน AI");
        setLoadingAI(false);
        return;
    }
    const text = await generateHRInsights();
    setInsight(text);
    setLoadingAI(false);
  };

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-orange-500 text-white border-none">
             <div className="text-3xl font-bold">{summary.presentTotal}</div>
             <div className="text-sm opacity-90">มาทำงานวันนี้</div>
          </Card>
          <Card className="bg-white">
             <div className="text-3xl font-bold text-pastel-orangeDark">{summary.leave}</div>
             <div className="text-sm text-gray-500">ลา</div>
          </Card>
          <Card className="bg-white">
             <div className="text-3xl font-bold text-red-400">{summary.late}</div>
             <div className="text-sm text-gray-500">มาสาย</div>
          </Card>
          <Card className="bg-white">
             <div className="text-3xl font-bold text-gray-400">{summary.total}</div>
             <div className="text-sm text-gray-500">พนักงานทั้งหมด</div>
          </Card>
       </div>

       {/* AI Insight Section */}
       <Card title="✨ บทวิเคราะห์ HR โดย AI" className="bg-gradient-to-r from-white to-orange-50 border-orange-200">
         <div className="flex gap-4">
            <div className="shrink-0 pt-1">
                <div className="w-10 h-10 rounded-full bg-pastel-accent flex items-center justify-center text-white">
                    AI
                </div>
            </div>
            <div>
                {loadingAI ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ) : (
                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                        {insight}
                    </p>
                )}
            </div>
         </div>
       </Card>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="สถิติการเข้างานรายแผนก">
             <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={deptStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{fill: '#FFF8F3'}}
                      />
                      <Legend verticalAlign="top" height={36}/>
                      <Bar name="มาปกติ" dataKey="present" stackId="a" fill="#FFB347" radius={[0,0,0,0]} />
                      <Bar name="สาย" dataKey="late" stackId="a" fill="#FF9E6F" />
                      <Bar name="ลา" dataKey="leave" stackId="a" fill="#60A5FA" />
                      <Bar name="ขาด" dataKey="absent" stackId="a" fill="#E0E0E0" radius={[4,4,0,0]} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </Card>

          <Card title="ภาพรวมประจำวัน">
            <div className="h-64 w-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={dailyStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {dailyStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
          </Card>
       </div>

       <Card title="จัดการข้อมูลพนักงาน">
          <div className="overflow-x-auto">
             <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                    <tr>
                        <th className="px-4 py-3 text-left">ชื่อ-นามสกุล</th>
                        <th className="px-4 py-3 text-left">ตำแหน่ง</th>
                        <th className="px-4 py-3 text-left">แผนก</th>
                        <th className="px-4 py-3 text-right">จัดการ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {db.getEmployees().map(emp => (
                        <tr key={emp.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium flex items-center gap-3">
                                <img src={emp.avatarUrl} className="w-8 h-8 rounded-full bg-gray-200" alt="" />
                                {emp.name}
                            </td>
                            <td className="px-4 py-3 text-gray-500">{emp.role}</td>
                            <td className="px-4 py-3 text-gray-500">{emp.department}</td>
                            <td className="px-4 py-3 text-right text-blue-500 cursor-pointer">แก้ไข</td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
       </Card>
    </div>
  );
};