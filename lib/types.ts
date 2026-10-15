export type TopicCloseOption = 'mark_participated' | 'mark_not_participated';

export interface User {
  id: string;
  uNumber?: string;
  name: string;
  email: string;
  ALS?: string;
  Lead?: string;
  role: 'admin' | 'user';
  isSuperAdmin?: boolean;
  team?: string;
  department?: string;
  password?: string;
  isPasswordSet?: boolean;
}

export type TopicType = 
  | 'WBT'
  | 'Web-Based Training'
  | 'Document Read and Sign' 
  | 'GPD/GPI Read and Sign' 
  | 'AHD/AHI Read and Sign' 
  | 'Training' 
  | 'Briefing' 
  | 'Role Play' 
  | 'Teams Calls' 
  | 'Ground Ops Community Calls'
  | 'Vitero Sessions'
  | 'Others'
  | 'Mandatory' 
  | 'Standard' 
  | 'Review'
  | 'Other';

export type TargetGroup = 'All' | 'Team' | 'Department' | 'Custom' | 'ALL' | 'ALS' | 'Lead' | 'ALS_AND_LEAD' | 'CUSTOM';
export type DateFilterType = 
  | 'all' 
  | 'week' 
  | 'month' 
  | 'range'
  | 'this_month'
  | 'last_one_month'
  | 'week_this_year'
  | 'select_month_year'
  | 'last_one_year'
  | 'custom';

export type DateFilterOptions = {
  type: DateFilterType;
  startDate?: string;
  endDate?: string;
  weekNumber?: number;
  year?: number;
  customStartDate?: string;
  customEndDate?: string;
  selectedMonth?: number | string;
  selectedYear?: number;
  selectedWeek?: number;
  selectedWeekNum?: number;
};

export interface TopicConfirmation {
  id: string;
  userId: string;
  topicId: string;
  userName?: string;
  userEmail?: string;
  documentTitle?: string;
  isLate?: boolean;
  lateReason?: string;
  wbtCertificateUrl?: string;
  wbtCertificateFileName?: string;
  wbtNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  confirmedAt: string;
  status: 'confirmed' | 'not_participated' | 'pending' | 'pending_wbt_verification' | 'rejected';
  timestamp?: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  content: string;
  customTypeDesc?: string;
  category?: string;
  type: TopicType;
  targetGroup: TargetGroup;
  targetTeams?: string[];
  targetDepartments?: string[];
  assignedUserIds?: string[];
  assignedUserNames?: string[];
  publishedDate?: string;
  effectiveDate?: string;
  createdBy: string;
  createdAt: string;
  dueDate?: string;
  status: 'active' | 'closed';
  isClosed?: boolean;
  closeOption?: TopicCloseOption;
}

export const WBT_TEAMS_UPLOAD_URL = 'https://lufthansagroup.sharepoint.com/:f:/r/sites/DELSM-SOLARSTORM/Shared%20Documents/5%EF%B8%8F%E2%83%A3%20ADMIN/Upload%20Certificates%20here?d=w356f678a872d473e9bc44cc22ec8ca52&csf=1&web=1&e=omtJfj';
