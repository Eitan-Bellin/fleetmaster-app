export interface Vehicle {
  id: number;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  status: 'active' | 'maintenance' | 'inactive';
  last_service_date?: string;
  mileage: number;
  holder?: string;
  owner?: string;
  category_id?: number;
  category_name?: string;
}

export interface VehicleCategory {
  id: number;
  name: string;
}

export interface Driver {
  id: number;
  name: string;
  license_number: string;
  phone: string;
  email: string;
  assigned_vehicle_id?: number;
  assigned_vehicle_plate?: string;
}

export interface MaintenanceRecord {
  id: number;
  vehicle_id: number;
  plate_number: string;
  make: string;
  model: string;
  description: string;
  date: string;
  cost: number;
}

export interface DashboardStats {
  total: number;
  active: number;
  maintenance: number;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  phone?: string;
  email?: string;
  role: 'admin' | 'manager' | 'viewer';
}
