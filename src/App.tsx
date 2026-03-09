import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Car, 
  Wrench, 
  Users, 
  Plus, 
  Search, 
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  DollarSign,
  Sparkles,
  Phone,
  Calendar,
  FileText,
  Edit2,
  Edit3,
  Trash2,
  Tag,
  Key,
  Lock,
  Mail,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { Vehicle, DashboardStats, User, Driver, MaintenanceRecord, VehicleCategory } from './types';

// Mock data for initial load if API fails
const MOCK_VEHICLES: Vehicle[] = [
  { id: 1, plate_number: '12-345-67', make: 'Toyota', model: 'Corolla', year: 2022, status: 'active', mileage: 15000, last_service_date: '2024-01-15' },
  { id: 2, plate_number: '89-012-34', make: 'Hyundai', model: 'Ioniq 5', year: 2023, status: 'active', mileage: 8000, last_service_date: '2024-02-10' },
  { id: 3, plate_number: '56-789-01', make: 'Skoda', model: 'Octavia', year: 2021, status: 'maintenance', mileage: 45000, last_service_date: '2023-11-20' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vehicles' | 'maintenance' | 'drivers' | 'users' | 'settings'>('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [mileageData, setMileageData] = useState<any[]>([]);
  const [costData, setCostData] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, active: 0, maintenance: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddMaintenanceModalOpen, setIsAddMaintenanceModalOpen] = useState(false);
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
  const [lastCreatedDriver, setLastCreatedDriver] = useState<{username: string} | null>(null);
  const [isAdminPasswordResetModalOpen, setIsAdminPasswordResetModalOpen] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);
  const [isEditDriverModalOpen, setIsEditDriverModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isResetUserPasswordModalOpen, setIsResetUserPasswordModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('plate_number');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<VehicleCategory | null>(null);

  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [editCategoryName, setEditCategoryName] = useState('');
  const [newVehicle, setNewVehicle] = useState({
    plate_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: 0,
    holder: '',
    owner: '',
    category_id: undefined as number | undefined
  });
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    phone: '',
    email: '',
    role: 'viewer' as User['role']
  });

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    type: 'alert' | 'confirm';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const showAlert = (message: string, title: string = 'הודעה') => {
    setDialog({ isOpen: true, title, message, type: 'alert' });
  };

  const showConfirm = (message: string, onConfirm: () => void, title: string = 'אישור פעולה') => {
    setDialog({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  const apiFetch = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user?.role || '',
        ...options.headers,
      }
    });
  };

  // Password Recovery State
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'email' | 'code' | 'new-password'>('email');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [devHint, setDevHint] = useState<string | null>(null);
  const [recoveryType, setRecoveryType] = useState<'password' | 'username'>('password');
  const [newMaintenance, setNewMaintenance] = useState({
    vehicle_id: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    cost: 0
  });
  const [newDriver, setNewDriver] = useState({
    name: '',
    license_number: '',
    phone: '',
    email: '',
    assigned_vehicle_id: undefined as number | undefined
  });

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('fleet_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Failed to parse saved user:', error);
      localStorage.removeItem('fleet_user');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('fleet_user', JSON.stringify(userData));
      } else {
        setLoginError('שם משתמש או סיסמה שגויים');
      }
    } catch (error) {
      setLoginError('שגיאת חיבור לשרת');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fleet_user');
  };

  const fetchData = async () => {
    try {
      const endpoints = [
        { url: '/api/vehicles', setter: setVehicles },
        { url: '/api/stats', setter: setStats },
        { url: '/api/users', setter: setUsers },
        { url: '/api/drivers', setter: setDrivers },
        { url: '/api/maintenance', setter: setMaintenance },
        { url: '/api/analytics/mileage', setter: setMileageData },
        { url: '/api/analytics/costs', setter: setCostData },
        { url: '/api/vehicle-categories', setter: setCategories }
      ];

      await Promise.all(endpoints.map(async ({ url, setter }) => {
        try {
          const res = await apiFetch(url);
          if (res.ok) {
            const data = await res.json();
            setter(data);
          }
        } catch (e) {
          console.error(`Failed to fetch ${url}:`, e);
        }
      }));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleDeleteMaintenance = (id: number) => {
    showConfirm('האם אתה בטוח שברצונך למחוק רישום טיפול זה?', async () => {
      try {
        const res = await apiFetch(`/api/maintenance/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchData();
        } else {
          const data = await res.json();
          showAlert(data.error || 'שגיאה במחיקת רישום טיפול', 'שגיאה');
        }
      } catch (error) {
        console.error('Failed to delete maintenance:', error);
      }
    });
  };

  const generateAiInsight = async () => {
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `
        נתח את נתוני צי הרכב הבאים ותן המלצות לחיסכון בעלויות ושיפור היעילות:
        רכבים: ${JSON.stringify(vehicles.map(v => ({ make: v.make, model: v.model, mileage: v.mileage, status: v.status })))}
        עלויות תחזוקה אחרונות: ${JSON.stringify(maintenance.slice(0, 5))}
        
        אנא ענה בעברית, בצורה מקצועית ותמציתית. השתמש בנקודות (bullet points).
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setAiInsight(response.text || 'לא ניתן היה להפיק תובנות כרגע.');
    } catch (error) {
      console.error('AI Error:', error);
      setAiInsight('שגיאה בהפקת תובנות בינה מלאכותית.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setIsAddUserModalOpen(false);
        setNewUser({ username: '', password: '', full_name: '', role: 'viewer', phone: '', email: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await apiFetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        setIsEditUserModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        showAlert(data.error || 'שגיאה בעדכון משתמש', 'שגיאה');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = (id: number) => {
    showConfirm('האם אתה בטוח שברצונך למחוק משתמש זה?', async () => {
      try {
        const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchData();
        } else {
          const data = await res.json();
          showAlert(data.error || 'שגיאה במחיקת משתמש', 'שגיאה');
        }
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    });
  };

  const handleDeleteVehicle = (id: number) => {
    showConfirm('האם אתה בטוח שברצונך למחוק רכב זה?', async () => {
      try {
        const res = await apiFetch(`/api/vehicles/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchData();
        } else {
          const data = await res.json();
          showAlert(data.error || 'שגיאה במחיקת רכב', 'שגיאה');
        }
      } catch (error) {
        console.error('Failed to delete vehicle:', error);
      }
    });
  };

  const handleDeleteDriver = (id: number) => {
    showConfirm('האם אתה בטוח שברצונך למחוק נהג זה?', async () => {
      try {
        const res = await apiFetch(`/api/drivers/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchData();
        } else {
          const data = await res.json();
          showAlert(data.error || 'שגיאה במחיקת נהג', 'שגיאה');
        }
      } catch (error) {
        console.error('Failed to delete driver:', error);
      }
    });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await apiFetch('/api/vehicle-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      if (res.ok) {
        setNewCategoryName('');
        fetchData();
      } else {
        const data = await res.json();
        showAlert(data.error || 'שגיאה בהוספת קטגוריה', 'שגיאה');
      }
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) return;
    try {
      const res = await apiFetch(`/api/vehicle-categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editCategoryName.trim() })
      });
      if (res.ok) {
        setEditingCategory(null);
        setEditCategoryName('');
        fetchData();
      } else {
        const data = await res.json();
        showAlert(data.error || 'שגיאה בעדכון קטגוריה', 'שגיאה');
      }
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = (id: number) => {
    showConfirm('האם אתה בטוח שברצונך למחוק קטגוריה זו?', async () => {
      try {
        const res = await apiFetch(`/api/vehicle-categories/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchData();
        } else {
          const data = await res.json();
          showAlert(data.error || 'שגיאה במחיקת קטגוריה', 'שגיאה');
        }
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    });
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle)
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewVehicle({ plate_number: '', make: '', model: '', year: new Date().getFullYear(), mileage: 0, holder: '', owner: '', category_id: undefined });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add vehicle:', error);
    }
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaintenance)
      });
      if (res.ok) {
        setIsAddMaintenanceModalOpen(false);
        setNewMaintenance({ vehicle_id: 0, description: '', date: new Date().toISOString().split('T')[0], cost: 0 });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add maintenance:', error);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDriver)
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddDriverModalOpen(false);
        setLastCreatedDriver({ username: newDriver.email });
        setNewDriver({ name: '', license_number: '', phone: '', email: '', assigned_vehicle_id: undefined });
        fetchData();
        if (data.devCode) {
          showAlert(`הנהג נוסף בהצלחה. מצב פיתוח: קוד האימות הוא ${data.devCode}`, 'נהג נוסף');
        }
      }
    } catch (error) {
      console.error('Failed to add driver:', error);
    }
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    try {
      const res = await apiFetch(`/api/vehicles/${editingVehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVehicle)
      });
      if (res.ok) {
        setIsEditVehicleModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to update vehicle:', error);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUserId) return;
    try {
      const res = await fetch(`/api/users/${resettingUserId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminNewPassword })
      });
      if (res.ok) {
        setIsAdminPasswordResetModalOpen(false);
        setAdminNewPassword('');
        showAlert('הסיסמה שונתה בהצלחה');
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
    }
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    try {
      const res = await fetch(`/api/drivers/${editingDriver.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDriver)
      });
      if (res.ok) {
        setIsEditDriverModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to update driver:', error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      showAlert('הסיסמאות אינן תואמות', 'שגיאה');
      return;
    }
    try {
      const res = await fetch(`/api/users/${user?.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordForm.new })
      });
      if (res.ok) {
        showAlert('הסיסמה שונתה בהצלחה');
        setPasswordForm({ current: '', new: '', confirm: '' });
      }
    } catch (error) {
      console.error('Failed to change password:', error);
    }
  };

  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    try {
      const res = await fetch(`/api/users/${resettingUser.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPasswordValue })
      });
      if (res.ok) {
        showAlert(`הסיסמה עבור ${resettingUser.username} אופסה בהצלחה`);
        setIsResetUserPasswordModalOpen(false);
        setResetPasswordValue('');
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
    }
  };

  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    try {
      const endpoint = recoveryType === 'password' ? '/api/auth/forgot-password' : '/api/auth/forgot-username';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.devCode) {
          setDevHint(`מצב פיתוח: הקוד שלך הוא ${data.devCode}`);
        } else if (data.devUsername) {
          setDevHint(`מצב פיתוח: שם המשתמש שלך הוא ${data.devUsername}`);
        }

        if (recoveryType === 'password') {
          setRecoveryStep('code');
        } else {
          showAlert(data.devUsername ? `מצב פיתוח: שם המשתמש הוא ${data.devUsername}` : 'שם המשתמש נשלח למייל שלך');
          if (!data.devUsername) setIsRecoveryModalOpen(false);
        }
      } else {
        setRecoveryError(data.error);
      }
    } catch (error) {
      setRecoveryError('שגיאת תקשורת עם השרת');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail, code: recoveryCode })
      });
      if (res.ok) {
        setRecoveryStep('new-password');
      } else {
        const data = await res.json();
        setRecoveryError(data.error);
      }
    } catch (error) {
      setRecoveryError('שגיאת תקשורת');
    }
  };

  const handleResetPasswordFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail, code: recoveryCode, newPassword: recoveryNewPassword })
      });
      if (res.ok) {
        showAlert('הסיסמה שונתה בהצלחה! כעת ניתן להתחבר');
        setIsRecoveryModalOpen(false);
        setRecoveryStep('email');
        setRecoveryEmail('');
        setRecoveryCode('');
        setRecoveryNewPassword('');
      } else {
        const data = await res.json();
        setRecoveryError(data.error);
      }
    } catch (error) {
      setRecoveryError('שגיאת תקשורת');
    }
  };

  const filteredVehicles = vehicles
    .filter(v => {
      const matchesSearch = v.plate_number.includes(searchQuery) || 
        v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.owner && v.owner.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.category_name && v.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = filterCategory === 'all' || v.category_id?.toString() === filterCategory;
      const matchesOwner = filterOwner === 'all' || v.owner === filterOwner;
      
      return matchesSearch && matchesCategory && matchesOwner;
    })
    .sort((a, b) => {
      if (sortBy === 'plate_number') return a.plate_number.localeCompare(b.plate_number);
      if (sortBy === 'mileage') return b.mileage - a.mileage;
      if (sortBy === 'year') return b.year - a.year;
      if (sortBy === 'category') return (a.category_name || '').localeCompare(b.category_name || '');
      return 0;
    });

  const uniqueOwners = Array.from(new Set(vehicles.map(v => v.owner).filter(Boolean))) as string[];

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-[#E5E5E7]"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-100">
              <Car size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">FleetMaster</h1>
            <p className="text-gray-500 mt-2">התחבר למערכת ניהול צי הרכב</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">שם משתמש</label>
              <input 
                type="text" 
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">סיסמה</label>
              <input 
                type="password" 
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {loginError}
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95"
            >
              התחבר
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-center">
            <button 
              onClick={() => {
                setRecoveryType('password');
                setRecoveryStep('email');
                setDevHint(null);
                setIsRecoveryModalOpen(true);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              שכחתי סיסמה
            </button>
            <button 
              onClick={() => {
                setRecoveryType('username');
                setRecoveryStep('email');
                setDevHint(null);
                setIsRecoveryModalOpen(true);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              שכחתי שם משתמש
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            משתמש ברירת מחדל: admin / admin123
          </p>
        </motion.div>

        {/* Recovery Modal */}
        <AnimatePresence>
          {isRecoveryModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsRecoveryModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">
                      {recoveryType === 'password' ? 'איפוס סיסמה' : 'שחזור שם משתמש'}
                    </h2>
                    <button onClick={() => setIsRecoveryModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                      <X size={24} />
                    </button>
                  </div>

                  {recoveryStep === 'email' && (
                    <form onSubmit={handleRecoveryRequest} className="space-y-6">
                      <p className="text-gray-500 text-sm">הזן את כתובת האימייל המשויכת לחשבונך כדי לקבל {recoveryType === 'password' ? 'קוד איפוס' : 'את שם המשתמש'}.</p>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">כתובת אימייל</label>
                        <input 
                          type="email" 
                          required
                          placeholder="אימייל..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                        />
                      </div>
                      {recoveryError && <p className="text-red-500 text-xs">{recoveryError}</p>}
                      {devHint && (
                        <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium border border-blue-100">
                          {devHint}
                        </div>
                      )}
                      <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-all">
                        שלח {recoveryType === 'password' ? 'קוד איפוס' : 'שם משתמש'}
                      </button>
                    </form>
                  )}

                  {recoveryStep === 'code' && (
                    <form onSubmit={handleVerifyCode} className="space-y-6">
                      <p className="text-gray-500 text-sm">הזן את הקוד בן 6 הספרות שנשלח למייל {recoveryEmail}</p>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">קוד אימות</label>
                        <input 
                          type="text" 
                          required
                          maxLength={6}
                          placeholder="קוד..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center text-2xl tracking-widest" 
                          value={recoveryCode}
                          onChange={(e) => setRecoveryCode(e.target.value)}
                        />
                      </div>
                      {recoveryError && <p className="text-red-500 text-xs">{recoveryError}</p>}
                      {devHint && (
                        <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium border border-blue-100">
                          {devHint}
                        </div>
                      )}
                      <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-all">
                        אמת קוד
                      </button>
                    </form>
                  )}

                  {recoveryStep === 'new-password' && (
                    <form onSubmit={handleResetPasswordFinal} className="space-y-6">
                      <p className="text-gray-500 text-sm">הקוד אומת בהצלחה. בחר סיסמה חדשה לחשבונך.</p>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">סיסמה חדשה</label>
                        <input 
                          type="password" 
                          required
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                          value={recoveryNewPassword}
                          onChange={(e) => setRecoveryNewPassword(e.target.value)}
                        />
                      </div>
                      {recoveryError && <p className="text-red-500 text-xs">{recoveryError}</p>}
                      <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-all">
                        שנה סיסמה והתחבר
                      </button>
                    </form>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans flex overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-l border-[#E5E5E7] flex flex-col h-screen sticky top-0 z-50"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 font-bold text-xl tracking-tight"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Car size={20} />
              </div>
              <span>FleetMaster</span>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="לוח בקרה" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            isOpen={isSidebarOpen}
          />
          <NavItem 
            icon={<Car size={20} />} 
            label="צי רכב" 
            active={activeTab === 'vehicles'} 
            onClick={() => setActiveTab('vehicles')}
            isOpen={isSidebarOpen}
          />
          <NavItem 
            icon={<Wrench size={20} />} 
            label="טיפולים" 
            active={activeTab === 'maintenance'} 
            onClick={() => setActiveTab('maintenance')}
            isOpen={isSidebarOpen}
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="נהגים" 
            active={activeTab === 'drivers'} 
            onClick={() => setActiveTab('drivers')}
            isOpen={isSidebarOpen}
          />
          {user.role === 'admin' && (
            <NavItem 
              icon={<Users size={20} className="text-purple-600" />} 
              label="ניהול משתמשים" 
              active={activeTab === 'users'} 
              onClick={() => setActiveTab('users')}
              isOpen={isSidebarOpen}
            />
          )}
        </nav>

        <div className="p-4 border-t border-[#E5E5E7]">
          <div className="mb-4 px-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">
              {user.full_name[0]}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">{user.full_name}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user.role}</p>
              </div>
            )}
          </div>
          <NavItem 
            icon={<Settings size={20} />} 
            label="הגדרות" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            isOpen={isSidebarOpen}
          />
          <NavItem 
            icon={<LogOut size={20} />} 
            label="התנתק" 
            active={false} 
            onClick={handleLogout}
            isOpen={isSidebarOpen}
          />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen">
        <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E5E7] sticky top-0 z-40 px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            {activeTab === 'dashboard' && 'לוח בקרה'}
            {activeTab === 'vehicles' && 'ניהול צי רכב'}
            {activeTab === 'maintenance' && 'יומן טיפולים'}
            {activeTab === 'drivers' && 'ניהול נהגים'}
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="חיפוש..." 
                className="bg-gray-100 border-none rounded-full py-2 pr-10 pl-4 w-64 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {canEdit && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <Plus size={18} />
                <span>הוסף רכב</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard 
                    title="סה״כ רכבים" 
                    value={stats.total} 
                    icon={<Car className="text-blue-600" />} 
                    trend="+2 החודש"
                  />
                  <StatCard 
                    title="רכבים פעילים" 
                    value={stats.active} 
                    icon={<CheckCircle2 className="text-emerald-600" />} 
                    trend="98% זמינות"
                  />
                  <StatCard 
                    title="בטיפול / תקולים" 
                    value={stats.maintenance} 
                    icon={<AlertCircle className="text-amber-600" />} 
                    trend="צפי לסיום: היום"
                  />
                  <StatCard 
                    title="סה״כ הוצאות (חודשי)" 
                    value={`₪${costData[0]?.total?.toLocaleString() || 0}`} 
                    icon={<DollarSign className="text-purple-600" />} 
                    trend="מעודכן להיום"
                  />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl p-6 border border-[#E5E5E7] shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                      <TrendingUp size={20} className="text-blue-600" />
                      קילומטראז׳ מוביל (5 רכבים)
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={mileageData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="plate_number" type="category" width={100} tick={{fontSize: 12}} />
                          <Tooltip cursor={{fill: 'transparent'}} />
                          <Bar dataKey="mileage" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-[#E5E5E7] shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                      <DollarSign size={20} className="text-purple-600" />
                      מגמת הוצאות תחזוקה
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <LineChart data={costData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="month" tick={{fontSize: 12}} />
                          <YAxis tick={{fontSize: 12}} />
                          <Tooltip />
                          <Line type="monotone" dataKey="total" stroke="#8B5CF6" strokeWidth={3} dot={{r: 6}} activeDot={{r: 8}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* AI Insights Section */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                          <Sparkles size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">תובנות Fleet AI</h3>
                          <p className="text-blue-100 text-sm">ניתוח חכם של נתוני הצי שלך</p>
                        </div>
                      </div>
                      <button 
                        onClick={generateAiInsight}
                        disabled={isAiLoading}
                        className="bg-white text-blue-600 px-6 py-2.5 rounded-full font-bold hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isAiLoading ? 'מנתח נתונים...' : 'הפק תובנות חדשות'}
                        {!isAiLoading && <ChevronRight size={18} />}
                      </button>
                    </div>

                    {aiInsight ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                      >
                        <div className="prose prose-invert max-w-none text-blue-50">
                          <Markdown>{aiInsight}</Markdown>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-white/20 rounded-2xl">
                        <p className="text-blue-100 italic">לחץ על הכפתור כדי לקבל המלצות מבוססות בינה מלאכותית לניהול הצי שלך</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity & Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl p-6 border border-[#E5E5E7] shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                      <Clock size={20} className="text-blue-600" />
                      פעילות אחרונה
                    </h3>
                    <div className="space-y-6">
                      {maintenance.slice(0, 3).map((m, i) => (
                        <ActivityItem 
                          key={m.id}
                          title={m.description} 
                          subtitle={`${m.plate_number} • ${m.make} ${m.model}`} 
                          time={m.date}
                          status="success"
                        />
                      ))}
                      {maintenance.length === 0 && (
                        <p className="text-center text-gray-400 py-4">אין פעילות אחרונה להצגה</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-[#E5E5E7] shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                      <AlertCircle size={20} className="text-amber-600" />
                      התראות דחופות
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                        <AlertCircle className="text-amber-600 mt-1" size={18} />
                        <div>
                          <p className="font-medium text-amber-900">ביטוח חובה פג תוקף</p>
                          <p className="text-sm text-amber-700">רכב 89-012-34 בעוד 3 ימים</p>
                        </div>
                      </div>
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                        <AlertCircle className="text-red-600 mt-1" size={18} />
                        <div>
                          <p className="font-medium text-red-900">חריגת מהירות חריגה</p>
                          <p className="text-sm text-red-700">רכב 12-345-67 • כביש 6 צפון</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'vehicles' && (
              <motion.div 
                key="vehicles"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="חיפוש לפי מספר רכב, יצרן, מודל, בעלים או קטגוריה..." 
                        className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <select 
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="all">כל הקטגוריות</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>

                  <select 
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={filterOwner}
                    onChange={(e) => setFilterOwner(e.target.value)}
                  >
                    <option value="all">כל הבעלים</option>
                    {uniqueOwners.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>

                  <select 
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="plate_number">מיין לפי מספר רכב</option>
                    <option value="mileage">מיין לפי קילומטראז׳</option>
                    <option value="year">מיין לפי שנתון</option>
                    <option value="category">מיין לפי קטגוריה</option>
                  </select>

                  {canEdit && (
                    <button 
                      onClick={() => setIsManageCategoriesModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
                    >
                      <Settings size={18} />
                      ניהול קטגוריות
                    </button>
                  )}

                  {canEdit && (
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      <Plus size={18} />
                      הוספת רכב
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#E5E5E7] shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-[#E5E5E7] bg-gray-50/50">
                    <span className="text-sm text-gray-500">מציג {filteredVehicles.length} רכבים</span>
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4 font-medium">מספר רכב</th>
                          <th className="px-6 py-4 font-medium">יצרן ומודל</th>
                          <th className="px-6 py-4 font-medium">קטגוריה</th>
                          <th className="px-6 py-4 font-medium">בעלים</th>
                          <th className="px-6 py-4 font-medium">מחזיק</th>
                          <th className="px-6 py-4 font-medium">סטטוס</th>
                          <th className="px-6 py-4 font-medium">קילומטראז׳</th>
                          <th className="px-6 py-4 font-medium">פעולות</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredVehicles.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <Car size={48} className="text-gray-200" />
                                <p>לא נמצאו רכבים העונים לחיפוש</p>
                                {canEdit && (
                                  <button 
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="text-blue-600 font-medium hover:underline"
                                  >
                                    הוסף רכב חדש
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredVehicles.map((vehicle) => (
                            <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="px-6 py-4 font-mono font-medium">{vehicle.plate_number}</td>
                              <td className="px-6 py-4">
                                <div className="font-medium">{vehicle.make}</div>
                                <div className="text-sm text-gray-500">{vehicle.model}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                                  {vehicle.category_name || 'ללא קטגוריה'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-600">{vehicle.owner || '—'}</td>
                              <td className="px-6 py-4 text-gray-600">{vehicle.holder || '—'}</td>
                              <td className="px-6 py-4">
                                <StatusBadge status={vehicle.status} />
                              </td>
                              <td className="px-6 py-4 text-gray-600">{vehicle.mileage.toLocaleString()} ק״מ</td>
                              <td className="px-6 py-4 text-left">
                                <div className="flex items-center justify-end gap-2">
                                  {canEdit && (
                                    <button 
                                      onClick={() => {
                                        setEditingVehicle(vehicle);
                                        setIsEditVehicleModalOpen(true);
                                      }}
                                      className="p-2 text-blue-600 hover:text-blue-800 transition-colors opacity-0 group-hover:opacity-100"
                                      title="ערוך רכב"
                                    >
                                      <Edit2 size={18} />
                                    </button>
                                  )}
                                  {canEdit && (
                                    <button 
                                      onClick={() => handleDeleteVehicle(vehicle.id)}
                                      className="p-2 text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                      title="מחק רכב"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4 p-4">
                    {filteredVehicles.length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center text-gray-500">
                        <Car size={48} className="mx-auto mb-4 text-gray-200" />
                        <p>לא נמצאו רכבים</p>
                      </div>
                    ) : (
                      filteredVehicles.map((vehicle) => (
                        <div key={vehicle.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-lg">{vehicle.plate_number}</span>
                            <StatusBadge status={vehicle.status} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-gray-400 text-xs">יצרן ומודל</p>
                              <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">מחזיק</p>
                              <p className="font-medium">{vehicle.holder || '—'}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">קילומטראז׳</p>
                              <p className="font-medium">{vehicle.mileage.toLocaleString()} ק״מ</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">טיפול אחרון</p>
                              <p className="font-medium">{vehicle.last_service_date || '—'}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-gray-50">
                            <button 
                              onClick={() => {
                                setEditingVehicle(vehicle);
                                setIsEditVehicleModalOpen(true);
                              }}
                              className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                            >
                              <Edit2 size={16} />
                              ערוך
                            </button>
                            <button 
                              onClick={() => handleDeleteVehicle(vehicle.id)}
                              className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                            >
                              <Trash2 size={16} />
                              מחק
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'maintenance' && (
              <motion.div 
                key="maintenance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">יומן טיפולים ותחזוקה</h2>
                  {canEdit && (
                    <button 
                      onClick={() => setIsAddMaintenanceModalOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-sm"
                    >
                      <Plus size={18} />
                      <span>הוסף רישום טיפול</span>
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#E5E5E7] shadow-sm overflow-hidden">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium">תאריך</th>
                        <th className="px-6 py-4 font-medium">רכב</th>
                        <th className="px-6 py-4 font-medium">תיאור הטיפול</th>
                        <th className="px-6 py-4 font-medium">עלות</th>
                        <th className="px-6 py-4 font-medium">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {maintenance.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-500">אין רישומי טיפול במערכת</td>
                        </tr>
                      ) : (
                        maintenance.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium">{m.date}</td>
                            <td className="px-6 py-4">
                              <div className="font-medium">{m.plate_number}</div>
                              <div className="text-xs text-gray-500">{m.make} {m.model}</div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{m.description}</td>
                            <td className="px-6 py-4 font-bold text-amber-600">₪{m.cost.toLocaleString()}</td>
                            <td className="px-6 py-4 text-left">
                              {canEdit && (
                                <button 
                                  onClick={() => handleDeleteMaintenance(m.id)}
                                  className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                  title="מחק טיפול"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'drivers' && (
              <motion.div 
                key="drivers"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">ניהול נהגים</h2>
                  {canEdit && (
                    <button 
                      onClick={() => setIsAddDriverModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-sm"
                    >
                      <Plus size={18} />
                      <span>הוסף נהג חדש</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drivers.length === 0 ? (
                    <div className="col-span-full bg-white rounded-2xl p-12 border border-[#E5E5E7] text-center text-gray-500">
                      אין נהגים רשומים במערכת
                    </div>
                  ) : (
                    drivers.map((d) => (
                      <div key={d.id} className="bg-white rounded-2xl p-6 border border-[#E5E5E7] shadow-sm hover:shadow-md transition-all relative group">
                        <div className="absolute top-4 left-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit && (
                            <button 
                              onClick={() => {
                                setEditingDriver(d);
                                setIsEditDriverModalOpen(true);
                              }}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canEdit && (
                            <button 
                              onClick={() => {
                                // Find user associated with this driver email
                                const driverUser = users.find(u => u.email === d.email);
                                if (driverUser) {
                                  setResettingUserId(driverUser.id);
                                  setIsAdminPasswordResetModalOpen(true);
                                } else {
                                  showAlert('לא נמצא חשבון משתמש מקושר לנהג זה', 'שגיאה');
                                }
                              }}
                              className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                              title="איפוס סיסמה"
                            >
                              <Key size={14} />
                            </button>
                          )}
                          {canEdit && (
                            <button 
                              onClick={() => handleDeleteDriver(d.id)}
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              title="מחק נהג"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                            {d.name[0]}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                            d.assigned_vehicle_id ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-700 border-gray-100'
                          }`}>
                            {d.assigned_vehicle_id ? 'משובץ לרכב' : 'לא משובץ'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold mb-1">{d.name}</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-gray-400" />
                            <span>רישיון: {d.license_number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-gray-400" />
                            <span>טלפון: {d.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-gray-400" />
                            <span>אימייל: {d.email}</span>
                          </div>
                          {d.assigned_vehicle_plate && (
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                              <Car size={14} className="text-blue-600" />
                              <span className="font-medium text-blue-600">רכב משויך: {d.assigned_vehicle_plate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && user.role === 'admin' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">ניהול משתמשי מערכת</h2>
                  <button 
                    onClick={() => setIsAddUserModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-sm"
                  >
                    <Plus size={18} />
                    <span>הוסף משתמש</span>
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-[#E5E5E7] shadow-sm overflow-hidden">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium">שם מלא</th>
                        <th className="px-6 py-4 font-medium">שם משתמש</th>
                        <th className="px-6 py-4 font-medium">תפקיד</th>
                        <th className="px-6 py-4 font-medium">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium">{u.full_name}</td>
                          <td className="px-6 py-4 text-gray-600">{u.username}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                              u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                              u.role === 'manager' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              'bg-gray-50 text-gray-700 border-gray-100'
                            }`}>
                              {u.role === 'admin' ? 'מנהל על' : u.role === 'manager' ? 'מנהל' : 'צופה'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingUser(u);
                                  setIsEditUserModalOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                title="ערוך משתמש"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => {
                                  setResettingUser(u);
                                  setIsResetUserPasswordModalOpen(true);
                                }}
                                className="text-amber-600 hover:text-amber-700 p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                title="איפוס סיסמה"
                              >
                                <Key size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={u.username === 'admin'}
                                className="text-red-400 hover:text-red-600 disabled:opacity-30 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                title="מחק משתמש"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="bg-white rounded-3xl p-8 border border-[#E5E5E7] shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <Settings size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">הגדרות חשבון</h2>
                      <p className="text-sm text-gray-500">נהל את פרטי המשתמש והאבטחה שלך</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">שם מלא</p>
                        <p className="font-semibold">{user.full_name}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">שם משתמש</p>
                        <p className="font-semibold">{user.username}</p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Lock size={18} className="text-amber-600" />
                        שינוי סיסמה
                      </h3>
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">סיסמה חדשה</label>
                          <input 
                            type="password" 
                            required
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                            value={passwordForm.new}
                            onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">אימות סיסמה חדשה</label>
                          <input 
                            type="password" 
                            required
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                            value={passwordForm.confirm}
                            onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                          />
                        </div>
                        <button 
                          type="submit"
                          className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-black transition-all active:scale-95"
                        >
                          עדכן סיסמה
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-[#E5E5E7] shadow-sm">
                  <h3 className="text-lg font-bold mb-4">אודות המערכת</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>גרסת מערכת: 1.2.0 (Pro Edition)</p>
                    <p>סטטוס שרת: פעיל</p>
                    <p>© 2026 FleetMaster Solutions. כל הזכויות שמורות.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Manage Categories Modal */}
      <AnimatePresence>
        {isManageCategoriesModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsManageCategoriesModalOpen(false);
                setEditingCategory(null);
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">ניהול קטגוריות רכב</h2>
                  <button onClick={() => {
                    setIsManageCategoriesModalOpen(false);
                    setEditingCategory(null);
                  }} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                
                {!editingCategory ? (
                  <form className="flex gap-2 mb-8" onSubmit={handleAddCategory}>
                    <input 
                      type="text" 
                      placeholder="שם קטגוריה חדשה..." 
                      required
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95">
                      הוסף
                    </button>
                  </form>
                ) : (
                  <form className="flex flex-col gap-4 mb-8 p-4 bg-blue-50 rounded-2xl border border-blue-100" onSubmit={handleUpdateCategory}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">עריכת קטגוריה</span>
                      <button type="button" onClick={() => setEditingCategory(null)} className="text-blue-400 hover:text-blue-600">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        required
                        className="flex-1 bg-white border border-blue-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95">
                        עדכן
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map(cat => (
                    <div key={cat.id} className="group flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                      <span className="font-semibold text-gray-700">{cat.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditCategoryName(cat.name);
                          }}
                          className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-100 rounded-xl transition-colors"
                          title="ערוך"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors"
                          title="מחק"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-3">
                        <Tag size={24} />
                      </div>
                      <p className="text-gray-400 font-medium">אין קטגוריות מוגדרות עדיין</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Vehicle Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">הוספת רכב חדש</h2>
                  <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                
                <form className="space-y-6" onSubmit={handleAddVehicle}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">מספר רכב</label>
                      <input 
                        type="text" 
                        placeholder="00-000-00" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newVehicle.plate_number}
                        onChange={(e) => setNewVehicle({...newVehicle, plate_number: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">שנת ייצור</label>
                      <input 
                        type="number" 
                        placeholder="2024" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newVehicle.year}
                        onChange={(e) => setNewVehicle({...newVehicle, year: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">יצרן</label>
                      <input 
                        type="text" 
                        placeholder="למשל: טויוטה" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newVehicle.make}
                        onChange={(e) => setNewVehicle({...newVehicle, make: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">דגם</label>
                      <input 
                        type="text" 
                        placeholder="למשל: קורולה" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newVehicle.model}
                        onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">קילומטראז׳ נוכחי</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newVehicle.mileage}
                        onChange={(e) => setNewVehicle({...newVehicle, mileage: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">קטגוריה</label>
                      <select 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={newVehicle.category_id || ''}
                        onChange={(e) => setNewVehicle({...newVehicle, category_id: e.target.value ? parseInt(e.target.value) : undefined})}
                      >
                        <option value="">בחר קטגוריה...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">בעלים / חברת ליסינג</label>
                      <input 
                        type="text" 
                        placeholder="למשל: אלדן, פרטי..." 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newVehicle.owner || ''}
                        onChange={(e) => setNewVehicle({...newVehicle, owner: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">מחזיק נוכחי</label>
                      <input 
                        type="text" 
                        placeholder="שם הנהג המחזיק..." 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newVehicle.holder || ''}
                        onChange={(e) => setNewVehicle({...newVehicle, holder: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95">
                      שמור רכב
                    </button>
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all active:scale-95">
                      ביטול
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddUserModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">הוספת משתמש חדש</h2>
                  <button onClick={() => setIsAddUserModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                
                <form className="space-y-6" onSubmit={handleAddUser}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">שם מלא</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">שם משתמש</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">סיסמה</label>
                      <input 
                        type="password" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">תפקיד</label>
                      <select 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value as User['role']})}
                      >
                        <option value="viewer">צופה (קריאה בלבד)</option>
                        <option value="manager">מנהל (עריכה)</option>
                        <option value="admin">מנהל על (ניהול משתמשים)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">אימייל (לשחזור סיסמה)</label>
                      <input 
                        type="email" 
                        required
                        placeholder="user@example.com"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">טלפון</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="05X-XXXXXXX"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newUser.phone}
                        onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-purple-200 active:scale-95">
                      צור משתמש
                    </button>
                    <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all active:scale-95">
                      ביטול
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Maintenance Modal */}
      <AnimatePresence>
        {isAddMaintenanceModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddMaintenanceModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">הוספת רישום טיפול</h2>
                  <button onClick={() => setIsAddMaintenanceModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                
                <form className="space-y-6" onSubmit={handleAddMaintenance}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">בחר רכב</label>
                    <select 
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={newMaintenance.vehicle_id}
                      onChange={(e) => setNewMaintenance({...newMaintenance, vehicle_id: parseInt(e.target.value)})}
                    >
                      <option value="">בחר רכב מהרשימה...</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">תיאור הטיפול</label>
                    <textarea 
                      required
                      placeholder="למשל: טיפול 10,000, החלפת בלמים..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none" 
                      value={newMaintenance.description}
                      onChange={(e) => setNewMaintenance({...newMaintenance, description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">תאריך</label>
                      <input 
                        type="date" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newMaintenance.date}
                        onChange={(e) => setNewMaintenance({...newMaintenance, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">עלות (₪)</label>
                      <input 
                        type="number" 
                        required
                        placeholder="0"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newMaintenance.cost}
                        onChange={(e) => setNewMaintenance({...newMaintenance, cost: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-amber-200 active:scale-95">
                      שמור טיפול
                    </button>
                    <button type="button" onClick={() => setIsAddMaintenanceModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all active:scale-95">
                      ביטול
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Reset Password Modal */}
      <AnimatePresence>
        {isAdminPasswordResetModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminPasswordResetModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">שינוי סיסמה למשתמש</h2>
                  <button onClick={() => setIsAdminPasswordResetModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                
                <form className="space-y-6" onSubmit={handleAdminResetPassword}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">סיסמה חדשה</label>
                    <input 
                      type="password" 
                      required
                      placeholder="הזן סיסמה חדשה..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    עדכן סיסמה
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {lastCreatedDriver && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">הנהג נוסף בהצלחה!</h2>
                <p className="text-gray-600 mb-8 text-lg">נוצר עבורו חשבון גישה למערכת:</p>
                
                <div className="bg-gray-50 rounded-2xl p-6 space-y-4 mb-8 text-right" dir="rtl">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">שם משתמש (אימייל)</label>
                    <div className="text-xl font-mono font-bold text-blue-600">{lastCreatedDriver.username}</div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">נשלח לנהג מייל עם קוד אימות להגדרת סיסמה חדשה.</p>
                  </div>
                </div>

                <button 
                  onClick={() => setLastCreatedDriver(null)}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  הבנתי, תודה
                </button>
                <p className="mt-4 text-sm text-gray-400 italic">מומלץ לבקש מהנהג לשנות את הסיסמה בכניסה הראשונה</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAddDriverModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddDriverModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">הוספת נהג חדש</h2>
                  <button onClick={() => setIsAddDriverModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                
                <form className="space-y-6" onSubmit={handleAddDriver}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">שם מלא</label>
                    <input 
                      type="text" 
                      required
                      placeholder="ישראל ישראלי"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      value={newDriver.name}
                      onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">מספר רישיון</label>
                      <input 
                        type="text" 
                        required
                        placeholder="00000000"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newDriver.license_number}
                        onChange={(e) => setNewDriver({...newDriver, license_number: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">טלפון</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="050-0000000"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={newDriver.phone}
                        onChange={(e) => setNewDriver({...newDriver, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">אימייל (לאיפוס סיסמה)</label>
                    <input 
                      type="email" 
                      required
                      placeholder="driver@example.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      value={newDriver.email}
                      onChange={(e) => setNewDriver({...newDriver, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">שיוך לרכב (אופציונלי)</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={newDriver.assigned_vehicle_id || ''}
                      onChange={(e) => setNewDriver({...newDriver, assigned_vehicle_id: e.target.value ? parseInt(e.target.value) : undefined})}
                    >
                      <option value="">ללא שיוך רכב...</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95">
                      שמור נהג
                    </button>
                    <button type="button" onClick={() => setIsAddDriverModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all active:scale-95">
                      ביטול
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Vehicle Modal */}
      <AnimatePresence>
        {isEditVehicleModalOpen && editingVehicle && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditVehicleModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">עריכת רכב</h2>
                  <button onClick={() => setIsEditVehicleModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                
                <form className="space-y-6" onSubmit={handleUpdateVehicle}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">מספר רכב</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={editingVehicle.plate_number}
                        onChange={(e) => setEditingVehicle({...editingVehicle, plate_number: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">מחזיק הרכב</label>
                      <input 
                        type="text" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={editingVehicle.holder || ''}
                        onChange={(e) => setEditingVehicle({...editingVehicle, holder: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">יצרן</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={editingVehicle.make}
                        onChange={(e) => setEditingVehicle({...editingVehicle, make: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">דגם</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={editingVehicle.model}
                        onChange={(e) => setEditingVehicle({...editingVehicle, model: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">קילומטראז׳</label>
                      <input 
                        type="number" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={editingVehicle.mileage}
                        onChange={(e) => setEditingVehicle({...editingVehicle, mileage: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">קטגוריה</label>
                      <select 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={editingVehicle.category_id || ''}
                        onChange={(e) => setEditingVehicle({...editingVehicle, category_id: e.target.value ? parseInt(e.target.value) : undefined})}
                      >
                        <option value="">בחר קטגוריה...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">בעלים</label>
                      <input 
                        type="text" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={editingVehicle.owner || ''}
                        onChange={(e) => setEditingVehicle({...editingVehicle, owner: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">סטטוס</label>
                      <select 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={editingVehicle.status}
                        onChange={(e) => setEditingVehicle({...editingVehicle, status: e.target.value as Vehicle['status']})}
                      >
                        <option value="active">פעיל</option>
                        <option value="maintenance">בטיפול</option>
                        <option value="inactive">מושבת</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95">
                      עדכן רכב
                    </button>
                    <button type="button" onClick={() => setIsEditVehicleModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all active:scale-95">
                      ביטול
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Driver Modal */}
      <AnimatePresence>
        {isEditDriverModalOpen && editingDriver && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditDriverModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">עריכת נהג</h2>
                  <button onClick={() => setIsEditDriverModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                
                <form className="space-y-6" onSubmit={handleUpdateDriver}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">שם מלא</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      value={editingDriver.name}
                      onChange={(e) => setEditingDriver({...editingDriver, name: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">מספר רישיון</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={editingDriver.license_number}
                        onChange={(e) => setEditingDriver({...editingDriver, license_number: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">טלפון</label>
                      <input 
                        type="tel" 
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={editingDriver.phone}
                        onChange={(e) => setEditingDriver({...editingDriver, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">אימייל (לאיפוס סיסמה)</label>
                    <input 
                      type="email" 
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      value={editingDriver.email}
                      onChange={(e) => setEditingDriver({...editingDriver, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">שיוך לרכב</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={editingDriver.assigned_vehicle_id || ''}
                      onChange={(e) => setEditingDriver({...editingDriver, assigned_vehicle_id: e.target.value ? parseInt(e.target.value) : undefined})}
                    >
                      <option value="">ללא שיוך רכב...</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95">
                      עדכן נהג
                    </button>
                    <button type="button" onClick={() => setIsEditDriverModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all active:scale-95">
                      ביטול
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditUserModalOpen && editingUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditUserModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">עריכת משתמש</h2>
                  <button onClick={() => setIsEditUserModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                
                <form className="space-y-6" onSubmit={handleUpdateUser}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">שם מלא</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      value={editingUser.full_name}
                      onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">תפקיד</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value as User['role']})}
                      disabled={editingUser.username === 'admin'}
                    >
                      <option value="admin">מנהל על</option>
                      <option value="manager">מנהל</option>
                      <option value="viewer">צופה</option>
                    </select>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95">
                      עדכן משתמש
                    </button>
                    <button type="button" onClick={() => setIsEditUserModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all active:scale-95">
                      ביטול
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {isResetUserPasswordModalOpen && resettingUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetUserPasswordModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">איפוס סיסמה</h2>
                  <button onClick={() => setIsResetUserPasswordModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                
                <form className="space-y-6" onSubmit={handleResetUserPassword}>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-sm">
                    אתה עומד לאפס את הסיסמה עבור המשתמש: <strong>{resettingUser.username}</strong> ({resettingUser.full_name})
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">סיסמה חדשה</label>
                    <input 
                      type="text" 
                      required
                      placeholder="הזן סיסמה חדשה..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-amber-200 active:scale-95">
                      אפס סיסמה
                    </button>
                    <button type="button" onClick={() => setIsResetUserPasswordModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all active:scale-95">
                      ביטול
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Dialog Modal */}
      <AnimatePresence>
        {dialog.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${dialog.type === 'confirm' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                  {dialog.type === 'confirm' ? <HelpCircle size={32} /> : <AlertTriangle size={32} />}
                </div>
                <h3 className="text-xl font-bold mb-2">{dialog.title}</h3>
                <p className="text-gray-600 mb-6">{dialog.message}</p>
                <div className="flex gap-3">
                  {dialog.type === 'confirm' ? (
                    <>
                      <button 
                        onClick={() => {
                          dialog.onConfirm?.();
                          setDialog(prev => ({ ...prev, isOpen: false }));
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all active:scale-95"
                      >
                        אישור
                      </button>
                      <button 
                        onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-all active:scale-95"
                      >
                        ביטול
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all active:scale-95"
                    >
                      הבנתי
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, isOpen }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, isOpen: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
        ${active 
          ? 'bg-blue-50 text-blue-600 font-medium' 
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
      `}
    >
      <div className={`${active ? 'text-blue-600' : 'text-gray-400'}`}>
        {icon}
      </div>
      {isOpen && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm whitespace-nowrap"
        >
          {label}
        </motion.span>
      )}
    </button>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: number | string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E5E5E7] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">
          {icon}
        </div>
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {trend}
        </span>
      </div>
      <div className="text-3xl font-bold tracking-tight mb-1">{value}</div>
      <div className="text-sm text-gray-500 font-medium">{title}</div>
    </div>
  );
}

function ActivityItem({ title, subtitle, time, status }: { title: string, subtitle: string, time: string, status: 'success' | 'warning' | 'info' }) {
  return (
    <div className="flex gap-4">
      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
        status === 'success' ? 'bg-emerald-500' : 
        status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
      }`} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-sm">{title}</p>
          <span className="text-[10px] text-gray-400 font-medium uppercase">{time}</span>
        </div>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Vehicle['status'] }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    maintenance: 'bg-amber-50 text-amber-700 border-amber-100',
    inactive: 'bg-gray-50 text-gray-700 border-gray-100'
  };

  const labels = {
    active: 'פעיל',
    maintenance: 'בטיפול',
    inactive: 'מושבת'
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
