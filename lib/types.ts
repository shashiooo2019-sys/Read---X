export type TargetGroup = 'ALL' | 'ALS' | 'Lead';

export type TopicType =
  | 'Document Read and Sign'
  | 'GPD/GPI Read and Sign'
  | 'AHD/AHI Read and Sign'
  | 'Training'
  | 'Briefing'
  | 'Role Play'
  | 'Others';

export interface User {
  id: string;
  uNumber: string;
  name: string;
  email: string; // Active login identity
  loginEmail?: string; // Permanently registered login email
  workEmail?: string; // M365 work email (if private email is used as login)
  emailDomain?: string; // dlh.de, swiss.com, etc.
  isAls: boolean;
  isLead: boolean;
  isAdmin: boolean;
  department?: string;
  title?: string;
  accountStatus?: 'active' | 'disabled' | 'suspended';
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  isApprovedPrivateEmail?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface ApprovedUser {
  id: string;
  name: string;
  workEmail: string;
  loginEmail: string;
  uNumber: string;
  approvedBy: string;
  approvedAt: string;
  status: 'approved' | 'revoked';
  notes?: string;
}

export interface Topic {
  id: string;
  title: string;
  type: TopicType;
  customTypeDesc?: string;
  targetGroup: TargetGroup;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  effectiveDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  createdBy: string; // User email or name
  version?: string;
}

export interface TopicConfirmation {
  id: string;
  topicId: string;
  documentId?: string;
  documentTitle?: string;
  documentVersion?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  confirmedAt: string; // ISO string
  status: 'confirmed' | 'pending' | 're_sign_required';
  signatureText?: string;
  ipAddress?: string;
}

export interface AuthAuditLogItem {
  id: string;
  timestamp: string;
  action:
    | 'magic_link_requested'
    | 'magic_link_verified'
    | 'login_success'
    | 'logout'
    | 'email_changed_by_admin'
    | 'user_disabled'
    | 'user_reactivated'
    | 'user_approved'
    | 'user_created'
    | 'session_invalidated'
    | 'device_associated';
  userId?: string;
  performedBy: string;
  targetEmail?: string;
  details: string;
  ipAddress?: string;
}

export type DateFilterType =
  | 'all'
  | 'this_month'
  | 'last_one_month'
  | 'week_this_year'
  | 'select_month_year'
  | 'last_one_year'
  | 'custom';

export interface DateFilterOptions {
  type: DateFilterType;
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string; // YYYY-MM-DD
  selectedMonth?: number; // 0-11
  selectedYear?: number; // e.g. 2026
  selectedWeekNum?: number; // 1-52
}
