import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { Employee } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface LoginProps {
  onLogin: (user: Employee) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate network delay
    setTimeout(() => {
      const user = db.login(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
               <img 
                 src="https://placehold.co/200x80/orange/white?text=SD+Con" 
                 alt="SD Con Logo" 
                 className="h-16 w-auto object-contain rounded-lg shadow-sm"
               />
            </div>
            <h1 className="text-3xl font-bold text-pastel-text">เข้าสู่ระบบ</h1>
            <p className="text-gray-500 mt-2">HRM_SDcon v.1</p>
        </div>

        <Card className="shadow-xl shadow-orange-100/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username (ชื่อผู้ใช้)
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น emp01"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pastel-orangeDark focus:ring-2 focus:ring-orange-100 transition-all outline-none bg-gray-50 focus:bg-white"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password (รหัสผ่าน)
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pastel-orangeDark focus:ring-2 focus:ring-orange-100 transition-all outline-none bg-gray-50 focus:bg-white"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              เข้าสู่ระบบ
            </Button>
            
            <div className="text-xs text-center text-gray-400 mt-4">
                บัญชีทดสอบ:<br/>
                User: emp01 | Pass: password<br/>
                User: admin | Pass: password
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};