import { GoogleGenAI } from "@google/genai";
import { db } from "./mockDb";
import { AttendanceType, Role } from "../types";

export const generateHRInsights = async (): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "ไม่พบ API Key กรุณาระบุ Gemini API Key";
  }

  const ai = new GoogleGenAI({ apiKey });

  // Gather context from the mock DB
  const employees = db.getEmployees();
  const allAttendance = db.getAllAttendance();
  const allLeaves = db.getLeaves();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = allAttendance.filter(a => a.timestamp.startsWith(todayStr));
  
  const presentCount = new Set(todayAttendance.map(a => a.employeeId)).size;
  const lateCount = todayAttendance.filter(a => {
    const hour = new Date(a.timestamp).getHours();
    return a.type === AttendanceType.CHECK_IN && hour >= 9; // Late after 9 AM
  }).length;
  
  const pendingLeaves = allLeaves.filter(l => l.status === 'PENDING').length;

  const prompt = `
    Analyze the following HR data for today (${todayStr}) and provide a brief, professional executive summary (max 150 words) for the CEO. 
    Focus on attendance health and pending actions.

    Data:
    - Total Employees: ${employees.length}
    - Present Today: ${presentCount}
    - Late Arrivals: ${lateCount}
    - Pending Leave Requests: ${pendingLeaves}

    Please respond in Thai language. Use a professional and encouraging tone.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI";
  }
};