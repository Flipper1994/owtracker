import axios from 'axios';

const api = axios.create({
  baseURL: '/owtracker/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AdminUser {
  id: number;
  username: string;
  role: string;
  email?: string;
  created_at: string;
  last_login?: string;
}

export interface DashboardStats {
  total_invitations: number;
  total_admins: number;
  pending_rsvps: number;
}

export interface LoginResponse {
  message: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/login', { username, password });
  return response.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/logout');
};

export const getMe = async (): Promise<AdminUser> => {
  const response = await api.get<AdminUser>('/me');
  return response.data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get<DashboardStats>('/dashboard/stats');
  return response.data;
};

// Invitation types and API
export interface Invitation {
  id: number;
  uuid: string;
  guest_name: string;
  email?: string;
  phone?: string;
  status: 'pending' | 'accepted' | 'declined';
  confirmed_name?: string;
  food_preference?: string;
  language?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  responded_at?: string;
}

export interface InvitationResponse {
  invitation: Invitation;
  invitation_url: string;
}

export interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
}

export interface CreateInvitationRequest {
  guest_name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export const createInvitation = async (data: CreateInvitationRequest): Promise<InvitationResponse> => {
  const response = await api.post<InvitationResponse>('/invitations', data);
  return response.data;
};

export const getInvitations = async (): Promise<Invitation[]> => {
  const response = await api.get<Invitation[]>('/invitations');
  return response.data;
};

export const getInvitation = async (id: number): Promise<InvitationResponse> => {
  const response = await api.get<InvitationResponse>(`/invitations/${id}`);
  return response.data;
};

export const getInvitationStats = async (): Promise<InvitationStats> => {
  const response = await api.get<InvitationStats>('/invitations/stats');
  return response.data;
};

export const deleteInvitation = async (id: number): Promise<void> => {
  await api.delete(`/invitations/${id}`);
};

// Security Audit types and API
export interface LoginAttempt {
  id: number;
  ip_address: string;
  username: string;
  success: boolean;
  user_agent: string;
  created_at: string;
}

export interface SecurityStats {
  total_attempts: number;
  failed_attempts: number;
  success_attempts: number;
  unique_ips: number;
  last_24_hours: number;
}

export interface SuspiciousIP {
  ip_address: string;
  total_attempts: number;
  failed_attempts: number;
  last_attempt: string;
}

export interface SecurityAuditResponse {
  stats: SecurityStats;
  recent_attempts: LoginAttempt[];
  suspicious_ips: SuspiciousIP[];
}

export const getSecurityAudit = async (): Promise<SecurityAuditResponse> => {
  const response = await api.get<SecurityAuditResponse>('/security/audit');
  return response.data;
};

export const clearOldAttempts = async (): Promise<{ message: string; deleted: number }> => {
  const response = await api.delete<{ message: string; deleted: number }>('/security/clear-old');
  return response.data;
};

// Network Audit types and API
export interface AccessLog {
  id: number;
  ip_address: string;
  method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  user_agent: string;
  created_at: string;
}

export interface NetworkStats {
  total_requests: number;
  unique_ips: number;
  last_24_hours: number;
  success_requests: number;
  error_requests: number;
}

export interface PathStats {
  path: string;
  request_count: number;
  avg_latency_ms: number;
  error_count: number;
}

export interface IPStats {
  ip_address: string;
  request_count: number;
  last_request: string;
}

export interface NetworkAuditResponse {
  stats: NetworkStats;
  top_paths: PathStats[];
  top_ips: IPStats[];
  recent_logs: AccessLog[];
}

export const getNetworkAudit = async (): Promise<NetworkAuditResponse> => {
  const response = await api.get<NetworkAuditResponse>('/network/audit');
  return response.data;
};

export const clearOldAccessLogs = async (): Promise<{ message: string; deleted: number }> => {
  const response = await api.delete<{ message: string; deleted: number }>('/network/clear-old');
  return response.data;
};
