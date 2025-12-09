import React, { useState, useEffect } from 'react';
import { Employee, AttendanceType, AttendanceRecord, LeaveTypeCategory, LeaveStatus, LeaveRequest } from '../types';
import { db } from '../services/mockDb';
import { calculateDistance, formatDate, formatTime, getBase64 } from '../services/utils';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

interface Props {
  user: Employee;
}

export const EmployeeDashboard: React.FC<Props> = ({ user }) => {
  // Attendance State
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isInRange, setIsInRange] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  
  // History State
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves'>('attendance');
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);

  // Leave Request State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveTypeCategory>(LeaveTypeCategory.SICK);
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveFile, setLeaveFile] = useState<File | null>(null);

  const config = db.getConfig();

  useEffect(() => {
    updateLocation();
    loadHistory();
    loadLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyFilter, user.id, showLeaveModal]); // Reload leaves when modal closes

  const loadLeaves = () => {
      const leaves = db.getLeaves(user.id);
      // Sort by newest first
      setMyLeaves(leaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
  };

  const loadHistory = () => {
    const allHistory = db.getAttendanceHistory(user.id);
    const now = new Date();
    
    const filtered = allHistory.filter(record => {
        const recordDate = new Date(record.timestamp);
        switch(historyFilter) {
            case 'day':
                return recordDate.toDateString() === now.toDateString();
            case 'week':
                const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
                return recordDate >= oneWeekAgo;
            case 'month':
                return recordDate.getMonth() === new Date().getMonth() && recordDate.getFullYear() === new Date().getFullYear();
            case 'year':
                return recordDate.getFullYear() === new Date().getFullYear();
            default:
                return true;
        }
    });
    setHistory(filtered);
  };

  const updateLocation = () => {
    if (!navigator.geolocation) {
      setStatusMsg('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });

        const dist = calculateDistance(latitude, longitude, config.centerLat, config.centerLng);
        setDistance(dist);
        setIsInRange(dist <= config.radiusKm);
      },
      () => {
        setStatusMsg('ไม่สามารถระบุตำแหน่งของคุณได้');
      }
    );
  };

  const handleAttendance = async (type: AttendanceType) => {
    if (!currentLocation) {
        alert("กรุณาเปิดใช้งาน Location Service");
        return;
    }

    setLoading(true);

    try {
        let imageUrl = '';
        if (!isInRange && photo) {
            imageUrl = await getBase64(photo);
        } else if (!isInRange && !photo) {
            alert("คุณอยู่นอกพื้นที่ทำงาน จำเป็นต้องถ่ายรูปและระบุเหตุผล");
            setLoading(false);
            return;
        }

        const record: AttendanceRecord = {
            id: `ATT-${Date.now()}`,
            employeeId: user.id,
            timestamp: new Date().toISOString(),
            type,
            location: {
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                inOffice: isInRange
            },
            note: reason,
            imageUrl
        };

        db.addAttendance(record);
        loadHistory();
        setReason('');
        setPhoto(null);
        alert(`บันทึก${type === AttendanceType.CHECK_IN ? 'เวลาเข้างาน' : 'เวลาออกงาน'} เรียบร้อยแล้ว!`);
    } catch (e) {
        console.error(e);
        alert("เกิดข้อผิดพลาด");
    } finally {
        setLoading(false);
    }
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const today = new Date();
      const startDate = new Date(leaveStart);
      const daysCount = calculateDays(leaveStart, leaveEnd);
      const tenureDays = (today.getTime() - new Date(user.startDate).getTime()) / (1000 * 3600 * 24);

      // Validation Logic
      let errorMsg = "";

      if (leaveType === LeaveTypeCategory.SICK) {
          if (daysCount >= 3 && !leaveFile) {
              errorMsg = "ลาป่วยติดต่อกัน 3 วันขึ้นไป ต้องแนบใบรับรองแพทย์";
          }
      } else if (leaveType === LeaveTypeCategory.ANNUAL) {
          if (tenureDays < 365) {
              errorMsg = "อายุงานไม่ครบ 1 ปี ไม่สามารถลาพักร้อนได้";
          }
          const noticeTime = startDate.getTime() - today.getTime();
          const noticeDays = noticeTime / (1000 * 3600 * 24);
          if (noticeDays < 3) {
              errorMsg = "ลาพักร้อนต้องแจ้งล่วงหน้าอย่างน้อย 3 วัน";
          }
          if (daysCount > 6) {
              errorMsg = "สิทธิ์ลาพักร้อนไม่เกิน 6 วัน/ปี";
          }
      } else if (leaveType === LeaveTypeCategory.MATERNITY) {
          if (daysCount > 98) {
              errorMsg = "ลาคลอดบุตรได้ไม่เกิน 98 วัน";
          }
      } else if (leaveType === LeaveTypeCategory.STERILIZATION) {
          if (!leaveFile) {
              errorMsg = "ลาทำหมันต้องแนบใบรับรองแพทย์เสมอ";
          }
      } else if (leaveType === LeaveTypeCategory.TRAINING || leaveType === LeaveTypeCategory.MILITARY) {
          const noticeTime = startDate.getTime() - today.getTime();
          if (noticeTime < 0) { // Should be at least 1 day before (roughly)
               errorMsg = "ต้องแจ้งล่วงหน้าอย่างน้อย 1 วัน";
          }
      }

      if (errorMsg) {
          alert(errorMsg);
          return;
      }

      setLoading(true);
      try {
          const attachmentUrl = leaveFile ? await getBase64(leaveFile) : undefined;
          
          db.addLeaveRequest({
              id: `LEAVE-${Date.now()}`,
              employeeId: user.id,
              type: leaveType,
              startDate: leaveStart,
              endDate: leaveEnd,
              reason: leaveReason,
              status: LeaveStatus.PENDING,
              daysCount,
              attachmentUrl
          });

          alert("ส่งใบลาเรียบร้อยแล้ว รอการอนุมัติ");
          setShowLeaveModal(false);
          setLeaveReason('');
          setLeaveFile(null);
          loadLeaves(); // Refresh leaves immediately
      } catch (err) {
          alert("เกิดข้อผิดพลาด");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="bg-gradient-to-br from-white to-pastel-bg border-none">
          <div className="flex items-center gap-6">
             <img src={user.avatarUrl} alt="Profile" className="w-24 h-24 rounded-2xl shadow-md object-cover" />
             <div>
                <h2 className="text-2xl font-bold text-pastel-text">{user.name}</h2>
                <p className="text-gray-500 font-medium">{user.role} - {user.department}</p>
                <div className="mt-2 text-3xl font-light text-pastel-orangeDark">
                    {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' })}
                </div>
                <p className="text-xs text-gray-400 mt-1">เริ่มงาน: {formatDate(user.startDate)}</p>
             </div>
          </div>
        </Card>

        {/* Check-In Action Card */}
        <Card title="ลงเวลาทำงาน">
           <div className="space-y-4">
              <div className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                 <span>สถานะปัจจุบัน:</span>
                 <span className={`font-bold ${isInRange ? 'text-green-500' : 'text-orange-500'}`}>
                    {currentLocation ? (isInRange ? 'อยู่ในพื้นที่ทำงาน' : `อยู่นอกพื้นที่ (${distance?.toFixed(2)} กม.)`) : 'กำลังระบุตำแหน่ง...'}
                 </span>
              </div>
              
              {!isInRange && currentLocation && (
                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
                      <p className="text-xs text-orange-600 font-semibold">⚠️ คุณอยู่นอกพื้นที่ทำงาน</p>
                      
                      <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">ถ่ายรูปสถานที่</label>
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="user"
                            onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700"
                          />
                      </div>
                      <textarea 
                        placeholder="เหตุผล..." 
                        className="w-full p-2 border rounded-lg text-sm"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={() => handleAttendance(AttendanceType.CHECK_IN)} 
                    isLoading={loading}
                    className="w-full py-4 text-lg"
                  >
                    เข้างาน
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleAttendance(AttendanceType.CHECK_OUT)}
                    isLoading={loading}
                    className="w-full py-4 text-lg"
                  >
                    ออกงาน
                  </Button>
              </div>
              <button onClick={updateLocation} className="text-xs text-gray-400 hover:text-orange-500 underline w-full text-center">อัปเดตตำแหน่ง</button>
           </div>
        </Card>
      </div>

      {/* History & Leave Request */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div className="flex p-1 bg-gray-100 rounded-lg">
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'attendance' ? 'bg-white shadow text-pastel-orangeDark' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            ประวัติลงเวลา
                        </button>
                        <button
                            onClick={() => setActiveTab('leaves')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'leaves' ? 'bg-white shadow text-pastel-orangeDark' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            ประวัติการลา
                        </button>
                    </div>

                    {activeTab === 'attendance' && (
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar w-full sm:w-auto">
                            {['day', 'week', 'month', 'year'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setHistoryFilter(f as any)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${historyFilter === f ? 'bg-pastel-orangeDark text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    {f === 'day' ? 'วันนี้' : f === 'week' ? 'สัปดาห์นี้' : f === 'month' ? 'เดือนนี้' : 'ปีนี้'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {activeTab === 'attendance' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">วันที่</th>
                                    <th className="px-4 py-3">เวลา</th>
                                    <th className="px-4 py-3">ประเภท</th>
                                    <th className="px-4 py-3">สถานที่</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length > 0 ? history.map(record => (
                                    <tr key={record.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{formatDate(record.timestamp)}</td>
                                        <td className="px-4 py-3">{formatTime(record.timestamp)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.type === AttendanceType.CHECK_IN ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {record.type === AttendanceType.CHECK_IN ? 'เข้า' : 'ออก'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {record.location.inOffice ? 'สำนักงาน' : 'นอกพื้นที่'}
                                            {record.imageUrl && ' 📸'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-6 text-gray-400">
                                            ไม่พบข้อมูล
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 min-w-[100px]">ประเภท</th>
                                    <th className="px-4 py-3 min-w-[140px]">วันที่ลา</th>
                                    <th className="px-4 py-3 text-center min-w-[60px]">จำนวน</th>
                                    <th className="px-4 py-3 min-w-[100px]">สถานะ</th>
                                    <th className="px-4 py-3 min-w-[150px]">เหตุผล</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myLeaves.length > 0 ? myLeaves.map(leave => (
                                    <tr key={leave.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-700">
                                            {leave.type}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-xs">
                                            {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs">
                                            {leave.daysCount} วัน
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                                                leave.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                leave.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                leave.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {leave.status === 'APPROVED' ? 'อนุมัติ' :
                                                 leave.status === 'REJECTED' ? 'ไม่อนุมัติ' :
                                                 leave.status === 'PENDING' ? 'รออนุมัติ' : 'ยกเลิก'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[150px]">
                                            {leave.reason}
                                            {leave.attachmentUrl && ' 📎'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-6 text-gray-400">
                                            ไม่มีประวัติการลา
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
        
        <div>
            <Card title="เมนูด่วน">
                <div className="grid grid-cols-1 gap-3">
                    <Button 
                        variant="primary" 
                        className="justify-center w-full bg-pastel-accent"
                        onClick={() => setShowLeaveModal(true)}
                    >
                        📄 เขียนใบลา
                    </Button>
                    <div className="text-sm text-gray-500 mt-4 px-2">
                        <p className="font-bold mb-2">สิทธิ์คงเหลือ:</p>
                        <ul className="space-y-1 text-xs">
                            <li className="flex justify-between"><span>ลาพักร้อน</span> <span>6 วัน</span></li>
                            <li className="flex justify-between"><span>ลากิจ</span> <span>ตามจริง</span></li>
                            <li className="flex justify-between"><span>ลาป่วย</span> <span>30 วัน</span></li>
                        </ul>
                    </div>
                </div>
            </Card>
        </div>
      </div>

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                 <h2 className="text-xl font-bold mb-4 text-pastel-text">แบบฟอร์มขออนุมัติลา</h2>
                 <form onSubmit={handleLeaveSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">ประเภทการลา</label>
                        <select 
                            className="w-full p-2 border rounded-lg bg-gray-50"
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value as LeaveTypeCategory)}
                        >
                            <option value={LeaveTypeCategory.SICK}>ลาป่วย (ติดต่อกัน 3 วันต้องมีใบรับรอง)</option>
                            <option value={LeaveTypeCategory.PERSONAL}>ลากิจ (ตามระเบียบ)</option>
                            <option value={LeaveTypeCategory.ANNUAL}>ลาพักร้อน (อายุงาน 1 ปี+, แจ้งล่วงหน้า 3 วัน)</option>
                            <option value={LeaveTypeCategory.MATERNITY}>ลาคลอดบุตร (ไม่เกิน 98 วัน)</option>
                            <option value={LeaveTypeCategory.STERILIZATION}>ลาทำหมัน (แนบใบรับรองแพทย์)</option>
                            <option value={LeaveTypeCategory.TRAINING}>ลาฝึกอบรม (แจ้งล่วงหน้า 1 วัน)</option>
                            <option value={LeaveTypeCategory.MILITARY}>ลารับราชการทหาร</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">เริ่มวันที่</label>
                            <input 
                                type="date" 
                                required 
                                className="w-full p-2 border rounded-lg"
                                value={leaveStart}
                                onChange={(e) => setLeaveStart(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ถึงวันที่</label>
                            <input 
                                type="date" 
                                required 
                                className="w-full p-2 border rounded-lg"
                                value={leaveEnd}
                                onChange={(e) => setLeaveEnd(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">เหตุผลการลา</label>
                        <textarea 
                            required 
                            className="w-full p-2 border rounded-lg h-24"
                            placeholder="ระบุรายละเอียด..."
                            value={leaveReason}
                            onChange={(e) => setLeaveReason(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">เอกสารแนบ (ถ้ามี)</label>
                        <input 
                            type="file" 
                            accept="image/*,.pdf"
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700"
                            onChange={(e) => setLeaveFile(e.target.files ? e.target.files[0] : null)}
                        />
                        <p className="text-xs text-red-400 mt-1">
                            * ลาป่วย 3 วันขึ้นไป หรือ ลาทำหมัน จำเป็นต้องแนบเอกสาร
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setShowLeaveModal(false)}>ยกเลิก</Button>
                        <Button type="submit" className="flex-1" isLoading={loading}>ยืนยัน</Button>
                    </div>
                 </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};