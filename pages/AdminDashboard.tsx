import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { db } from '../services/mockDb';
import { generateHRInsights } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [insight, setInsight] = useState<string>('กำลังวิเคราะห์ข้อมูลโดย AI...');
  const [loadingAI, setLoadingAI] = useState(true);

  // Mock stats for chart
  const data = [
    { name: 'IT', present: 20, absent: 2, late: 1 },
    { name: 'HR', present: 5, absent: 0, late: 0 },
    { name: 'Sales', present: 15, absent: 3, late: 4 },
    { name: 'Marketing', present: 10, absent: 1, late: 2 },
  ];

  const pieData = [
    { name: 'มาปกติ', value: 400 },
    { name: 'สาย', value: 30 },
    { name: 'ลา', value: 20 },
    { name: 'ขาด', value: 10 },
  ];

  const COLORS = ['#FFB347', '#FF9E6F', '#FFD1A9', '#E0E0E0'];

  useEffect(() => {
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
    fetchInsight();
  }, []);

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-orange-500 text-white border-none">
             <div className="text-3xl font-bold">45</div>
             <div className="text-sm opacity-90">มาทำงานวันนี้</div>
          </Card>
          <Card className="bg-white">
             <div className="text-3xl font-bold text-pastel-orangeDark">3</div>
             <div className="text-sm text-gray-500">ลา</div>
          </Card>
          <Card className="bg-white">
             <div className="text-3xl font-bold text-red-400">2</div>
             <div className="text-sm text-gray-500">มาสาย</div>
          </Card>
          <Card className="bg-white">
             <div className="text-3xl font-bold text-gray-400">50</div>
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
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{fill: '#FFF8F3'}}
                      />
                      <Bar name="มาปกติ" dataKey="present" stackId="a" fill="#FFB347" radius={[0,0,4,4]} />
                      <Bar name="สาย" dataKey="late" stackId="a" fill="#FF9E6F" />
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
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs text-gray-500 mt-2">
                {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                        {entry.name}
                    </div>
                ))}
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