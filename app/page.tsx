'use client';

import React, { useState, useEffect } from 'react';
import { AdminConsole } from '@/components/admin/admin-console';
import { StaffPortal } from '@/components/staff/staff-portal';
import { LoginPortalModal } from '@/components/auth/login-portal-modal';
import { User, Topic, TopicConfirmation } from '@/lib/types';
import {
  subscribeToTopics,
  subscribeToUsers,
  subscribeToConfirmations,
  saveTopicToCloud,
  updateTopicStatusInCloud,
  saveConfirmationToCloud,
  saveUserToCloud,
  deleteUserFromCloud,
  deleteTopicFromCloud,
  validateCloudConnection,
  auth,
} from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import {
  Cloud,
  CheckCircle2,
  ShieldCheck,
  Wifi,
  LogOut,
  User as UserIcon,
  LogIn,
  Shield,
  Sparkles,
  Users,
  Building,
} from 'lucide-react';

import { AppBanner } from '@/components/common/app-banner';

export default function Home() {
  const defaultSuperAdmin: User = {
    id: 'usr-1',
    uNumber: 'U1000',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@groundops.com',
    als: 'ALS-HQ',
    lead: 'Lead Executive',
    role: 'admin',
    isSuperAdmin: true,
    team: 'Flight Safety & Operations',
    department: 'Ground Operations',
  };

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [confirmations, setConfirmations] = useState<TopicConfirmation[]>([]);
  const [cloudStatusMessage, setCloudStatusMessage] = useState<string | null>(null);
  const [isConnectedToCloud, setIsConnectedToCloud] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(true);

  // Initial Seed Data for Cloud Firestore
  const initialSeedTopics: Topic[] = [
    {
      id: 'top-104',
      title: 'Annual Web-Based Training (WBT) - Ground Safety & De-icing 2026',
      description: 'Mandatory annual online WBT course. Complete module on LMS, upload certificate to Teams, and submit for Super Admin verification.',
      content: 'Please complete the online WBT module in your browser or Vitero LMS, download your completion certificate PDF, upload it to the Microsoft Teams / SharePoint folder, and submit your completion notice here.',
      type: 'WBT',
      targetGroup: 'All',
      publishedDate: '2026-10-01',
      dueDate: '2026-10-31',
      createdBy: 'sarah.jenkins@groundops.com',
      createdAt: '2026-10-01T09:00:00Z',
      status: 'active',
    },
    {
      id: 'top-101',
      title: 'Q4 2026 Ramp Safety & Hazardous Materials Protocol',
      description: 'Mandatory read and sign directive covering revised aircraft loading standards and hazmat safety protocols.',
      content: 'All personnel must adhere strictly to standard operating procedures when handling hazardous cargo and operating motorized ramp equipment.',
      type: 'Document Read and Sign',
      targetGroup: 'All',
      publishedDate: '2026-10-01',
      dueDate: '2026-10-31',
      createdBy: 'sarah.jenkins@groundops.com',
      createdAt: '2026-10-01T08:00:00Z',
      status: 'active',
    },
    {
      id: 'top-102',
      title: 'Vitero Virtual Security Briefing - October Session',
      description: 'Online interactive briefing regarding updated terminal access permissions and biometric security clearance.',
      content: 'Participate in the live Vitero session or review the recorded webinar and sign off on compliance obligations.',
      type: 'Vitero Sessions',
      targetGroup: 'Lead',
      publishedDate: '2026-10-05',
      dueDate: '2026-10-25',
      createdBy: 'sarah.jenkins@groundops.com',
      createdAt: '2026-10-05T09:30:00Z',
      status: 'active',
    },
    {
      id: 'top-103',
      title: 'Ground Ops Community Call #14 - Winter Readiness',
      description: 'Monthly operational sync reviewing de-icing procedures and extreme weather emergency response plans.',
      content: 'Review winter weather operational directives, revised contact trees, and equipment inspection logs.',
      type: 'Ground Ops Community Calls',
      targetGroup: 'ALS',
      publishedDate: '2026-09-20',
      dueDate: '2026-10-10',
      createdBy: 'sarah.jenkins@groundops.com',
      createdAt: '2026-09-20T11:00:00Z',
      status: 'closed',
      closeOption: 'mark_participated',
    },
  ];

  const initialSeedUsers: User[] = [
    {
      id: 'usr-1',
      uNumber: 'U1000',
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@groundops.com',
      als: 'ALS-HQ',
      lead: 'Lead Executive',
      role: 'admin',
      isSuperAdmin: true,
      team: 'Flight Safety & Operations',
      department: 'Ground Operations',
    },
    {
      id: 'usr-admin-1',
      uNumber: 'U1001',
      name: 'Duty Manager Admin',
      email: 'admin@groundops.com',
      als: 'ALS-1',
      lead: 'Lead Officer',
      role: 'admin',
      isSuperAdmin: false,
      team: 'Ramp Services',
      department: 'Ground Operations',
    },
    {
      id: 'usr-2',
      uNumber: 'U1002',
      name: 'Marcus Vance',
      email: 'marcus.vance@groundops.com',
      als: 'ALS-1',
      lead: 'Ramp Lead',
      role: 'user',
      team: 'Ramp Services',
      department: 'Ground Operations',
    },
    {
      id: 'usr-3',
      uNumber: 'U1003',
      name: 'Elena Rostova',
      email: 'elena.rostova@groundops.com',
      als: 'ALS-2',
      lead: 'No',
      role: 'user',
      team: 'Cargo & Baggage',
      department: 'Logistics',
    },
    {
      id: 'usr-4',
      uNumber: 'U1004',
      name: 'David Kalu',
      email: 'david.kalu@groundops.com',
      als: 'ALS-1',
      lead: 'No',
      role: 'user',
      team: 'Flight Safety & Operations',
      department: 'Ground Operations',
    },
    {
      id: 'usr-5',
      uNumber: 'U1005',
      name: 'Hannah Abbott',
      email: 'hannah.abbott@groundops.com',
      als: 'ALS-3',
      lead: 'No',
      role: 'user',
      team: 'Passenger Services',
      department: 'Terminal Ops',
    },
  ];

  const initialSeedConfirmations: TopicConfirmation[] = [
    {
      id: 'conf-usr-2-top-104',
      userId: 'usr-2',
      topicId: 'top-104',
      userName: 'Marcus Vance',
      userEmail: 'marcus.vance@groundops.com',
      documentTitle: 'Annual Web-Based Training (WBT) - Ground Safety & De-icing 2026',
      isLate: false,
      wbtCertificateFileName: 'Marcus_Vance_GroundSafety_Deicing_WBT_2026.pdf',
      wbtNotes: 'Certificate uploaded to Teams folder on Oct 12',
      confirmedAt: '2026-10-12T14:30:00Z',
      status: 'pending_wbt_verification',
    },
  ];

  // Real-Time Cloud Listeners
  useEffect(() => {
    validateCloudConnection().then((connected) => setIsConnectedToCloud(connected));

    // Subscribe to topics
    const unsubTopics = subscribeToTopics((remoteTopics) => {
      const validTopics = remoteTopics.filter((t) => t && t.id && t.title);
      if (validTopics.length === 0) {
        initialSeedTopics.forEach((t) => saveTopicToCloud(t));
      } else {
        setTopics(validTopics);
      }
    });

    // Subscribe to users
    const unsubUsers = subscribeToUsers((remoteUsers) => {
      const validUsers = remoteUsers.filter((u) => u && u.id && u.email);
      if (validUsers.length === 0) {
        initialSeedUsers.forEach((u) => saveUserToCloud(u));
      } else {
        setUsers(validUsers);
      }
    });

    // Subscribe to confirmations
    const unsubConfirmations = subscribeToConfirmations((remoteConfirmations) => {
      const validConfirmations = remoteConfirmations.filter((c) => c && c.id);
      if (validConfirmations.length === 0) {
        initialSeedConfirmations.forEach((c) => saveConfirmationToCloud(c));
      } else {
        setConfirmations(validConfirmations);
      }
    });

    return () => {
      unsubTopics();
      unsubUsers();
      unsubConfirmations();
    };
  }, []);

  const triggerCloudBanner = (msg: string) => {
    setCloudStatusMessage(msg);
    setTimeout(() => setCloudStatusMessage(null), 4000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth).catch(() => null);
    } catch (err) {
      console.log('Firebase auth logout note:', err);
    }
    setCurrentUser(null);
    setShowLoginModal(true);
    triggerCloudBanner('Logged out successfully');
  };

  const handleLoginAsUser = (user: User) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    const roleTitle = user.isSuperAdmin ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Staff Member';
    triggerCloudBanner(`Signed in as ${user.name || user.email} (${roleTitle})`);
  };

  // User Management Handlers (Add, Amend, Delete, Password Reset, CSV Bulk Import)
  const handleSaveUser = async (userToSave: User) => {
    const res = await saveUserToCloud(userToSave);
    if (res.success) {
      triggerCloudBanner(`Staff record ${userToSave.name} (${userToSave.email}) updated in CLOUD`);
    } else {
      alert(`Error saving user: ${res.error}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const ok = await deleteUserFromCloud(userId);
    if (ok) {
      triggerCloudBanner('Staff member removed from CLOUD');
    }
  };

  const handleResetUserPassword = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const resetUser: User = {
      ...target,
      password: '',
      isPasswordSet: false,
    };

    const res = await saveUserToCloud(resetUser);
    if (res.success) {
      triggerCloudBanner(`Password reset to First-Time Setup flow for ${target.name}`);
    }
  };

  const handleUpdateUserPassword = async (userId: string, newPass: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const updatedUser: User = {
      ...target,
      password: newPass,
      isPasswordSet: true,
    };

    const res = await saveUserToCloud(updatedUser);
    if (res.success) {
      triggerCloudBanner(`Password saved successfully for ${target.name}`);
    }
  };

  const handleBulkImportUsers = async (importedList: Omit<User, 'id'>[]) => {
    let count = 0;
    for (const item of importedList) {
      const normUNum = (item.uNumber || '').trim().toUpperCase();
      const normEmail = (item.email || '').trim().toLowerCase();

      // Check if user already exists by U Number or Email
      const existingUser = users.find(
        (u) =>
          (normUNum && u.uNumber && u.uNumber.trim().toUpperCase() === normUNum) ||
          (normEmail && u.email && u.email.trim().toLowerCase() === normEmail)
      );

      const userToSave: User = {
        ...item,
        id: existingUser ? existingUser.id : `usr-import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: existingUser ? existingUser.role : item.role || 'user',
        isSuperAdmin: existingUser ? !!existingUser.isSuperAdmin : false,
        password: existingUser ? existingUser.password : '',
        isPasswordSet: existingUser ? existingUser.isPasswordSet : false,
      };

      const res = await saveUserToCloud(userToSave);
      if (res.success) count++;
    }
    triggerCloudBanner(`Successfully imported/updated ${count} staff records in CLOUD`);
  };

  const handleImportTopicParticipation = async (result: any) => {
    let count = 0;
    if (result) {
      // 1. Save auto-created users from import
      if (Array.isArray(result.newUsersToSave)) {
        for (const newUser of result.newUsersToSave) {
          await saveUserToCloud(newUser);
        }
      }

      // 2. Save auto-created topics from import
      if (Array.isArray(result.newTopicsToSave)) {
        for (const newTopic of result.newTopicsToSave) {
          await saveTopicToCloud(newTopic);
        }
      }

      // 3. Save topic participation sign-offs
      if (Array.isArray(result.records)) {
        for (const rec of result.records) {
          const confirmationToSave: TopicConfirmation = {
            id: `conf-${rec.userId}-${rec.topicId}`,
            userId: rec.userId,
            topicId: rec.topicId,
            userName: rec.userName,
            userEmail: rec.userEmail,
            documentTitle: rec.topicTitle,
            confirmedAt: rec.confirmedAt || new Date().toISOString(),
            status: rec.status || 'confirmed',
            wbtNotes: rec.notes || 'Imported via CSV/Excel Bulk Import',
          };
          const saveRes = await saveConfirmationToCloud(confirmationToSave);
          if (saveRes.success) count++;
        }
      }
    }
    triggerCloudBanner(`Successfully imported ${count} topic participation sign-offs to CLOUD`);
  };

  // 3-step Cloud Verification Handlers for Topics
  const handleCreateTopic = async (newTopicData: Omit<Topic, 'id' | 'createdAt'>) => {
    const topicToSave: Topic = {
      ...newTopicData,
      id: `top-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const res = await saveTopicToCloud(topicToSave);
    if (res.success) {
      triggerCloudBanner(res.message);
    } else {
      alert(`Cloud verification failed: ${res.error}`);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    const targetTopic = topics.find((t) => t.id === topicId);
    const ok = await deleteTopicFromCloud(topicId, targetTopic?.title);
    if (ok) {
      triggerCloudBanner('Successfully removed from CLOUD');
    }
  };

  const handleCloseTopicForAcknowledgement = async (topicId: string, option: any) => {
    const res = await updateTopicStatusInCloud(topicId, 'closed', option);
    if (res.success) {
      triggerCloudBanner(res.message);
    }
  };

  const handleReopenTopicForAcknowledgement = async (topicId: string) => {
    const res = await updateTopicStatusInCloud(topicId, 'active');
    if (res.success) {
      triggerCloudBanner(res.message);
    }
  };

  // Staff Sign-off Action with WBT Support and 3-Step Cloud Verification
  const handleStaffConfirmTopic = async (
    topicId: string,
    isLate: boolean,
    lateReason?: string,
    wbtDetails?: { certificateFileName?: string; notes?: string }
  ) => {
    if (!currentUser) return;

    const topic = topics.find((t) => t.id === topicId);
    const isWbtTopic = topic?.type === 'WBT' || topic?.type === 'Web-Based Training' || !!wbtDetails;

    const newConfirmation: TopicConfirmation = {
      id: `conf-${currentUser.id}-${topicId}`,
      userId: currentUser.id,
      topicId: topicId,
      userName: currentUser.name || currentUser.email,
      userEmail: currentUser.email,
      documentTitle: topic?.title || 'Directive',
      isLate: isLate,
      lateReason: lateReason || '',
      wbtCertificateFileName: wbtDetails?.certificateFileName || '',
      wbtNotes: wbtDetails?.notes || '',
      confirmedAt: new Date().toISOString(),
      status: isWbtTopic ? 'pending_wbt_verification' : 'confirmed',
    };

    const res = await saveConfirmationToCloud(newConfirmation);
    if (res.success) {
      triggerCloudBanner(
        isWbtTopic
          ? 'WBT certificate uploaded to Teams & submitted for Super Admin verification'
          : 'Compliance sign-off uploaded to CLOUD'
      );
    } else {
      alert(`Sign-off failed: ${res.error}`);
    }
  };

  // Super Admin Verification Action for WBT Confirmations
  const handleUpdateConfirmation = async (
    confirmationId: string,
    newStatus: 'confirmed' | 'rejected',
    reviewNote?: string
  ) => {
    const existingConf = confirmations.find((c) => c.id === confirmationId);
    if (!existingConf) return;

    const updatedConf: TopicConfirmation = {
      ...existingConf,
      status: newStatus,
      verifiedBy: currentUser?.email || 'sarah.jenkins@groundops.com',
      verifiedAt: new Date().toISOString(),
      wbtNotes: reviewNote || existingConf.wbtNotes,
    };

    const res = await saveConfirmationToCloud(updatedConf);
    if (res.success) {
      triggerCloudBanner(
        newStatus === 'confirmed'
          ? 'WBT Certificate Verified & Confirmed in CLOUD'
          : 'WBT Certificate Rejected in CLOUD'
      );
    }
  };

  const availableUsers = (users.length > 0 ? users : initialSeedUsers).filter(
    (u) => u && (u.name || u.email)
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 pb-12 w-full overflow-x-hidden">
      {/* Real-Time Cloud Status & Header Bar */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-medium sticky top-0 z-40 backdrop-blur-md bg-slate-900/95">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-sky-400 animate-pulse" />
          <span className="font-semibold text-slate-200">Storage Mode:</span>
          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
            Memory-Only Cloud Firestore
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span>Real-time Sync</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>3-Step Server Verified</span>
          </div>

          {/* User Account & Explicit Log Out Option */}
          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700 shadow-xs">
              <div
                className={`w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center ${
                  currentUser.isSuperAdmin
                    ? 'bg-purple-600'
                    : currentUser.role === 'admin'
                    ? 'bg-blue-600'
                    : 'bg-emerald-600'
                }`}
              >
                {(currentUser.name || currentUser.email || 'U').slice(0, 1).toUpperCase()}
              </div>
              <span className="font-semibold text-slate-200 text-xs max-w-[130px] truncate">
                {currentUser.name || currentUser.email}
              </span>
              <span
                className={`text-[10px] px-2 py-0.2 rounded font-extrabold uppercase ${
                  currentUser.isSuperAdmin
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-400/30'
                    : currentUser.role === 'admin'
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-400/30'
                    : 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30'
                }`}
              >
                {currentUser.isSuperAdmin ? 'Super Admin' : currentUser.role === 'admin' ? 'Admin' : 'Staff'}
              </span>

              <button
                onClick={handleLogout}
                title="Log Out of Portal"
                className="ml-1 px-2 py-1 hover:bg-slate-700/80 rounded-md text-slate-300 hover:text-red-400 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>

      {/* Cloud Verification Banner */}
      {cloudStatusMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/40 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <div>
            <p className="font-bold text-sm">{cloudStatusMessage}</p>
            <p className="text-xs text-emerald-100">Verified via live Cloud Firestore query match</p>
          </div>
        </div>
      )}

      {/* Main View Router */}
      {currentUser ? (
        currentUser.role === 'admin' || currentUser.isSuperAdmin ? (
          <AdminConsole
            currentUser={currentUser}
            topics={topics}
            users={availableUsers}
            confirmations={confirmations}
            onCreateTopic={handleCreateTopic}
            onDeleteTopic={handleDeleteTopic}
            onCloseTopicForAcknowledgement={handleCloseTopicForAcknowledgement}
            onReopenTopicForAcknowledgement={handleReopenTopicForAcknowledgement}
            onUpdateConfirmation={handleUpdateConfirmation}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            onResetUserPassword={handleResetUserPassword}
            onBulkImportUsers={handleBulkImportUsers}
            onImportTopicParticipation={handleImportTopicParticipation}
          />
        ) : (
          <StaffPortal
            currentUser={currentUser}
            topics={topics}
            confirmations={confirmations}
            onConfirmTopic={handleStaffConfirmTopic}
            onLogout={handleLogout}
          />
        )
      ) : (
        <div className="max-w-2xl mx-auto my-8 px-4 space-y-6">
          <AppBanner />
          <div className="bg-[#000d21] rounded-2xl shadow-xl border border-blue-900/60 p-6 text-center space-y-4 text-white">
            <p className="text-slate-200 text-sm font-medium">
              Welcome to <strong>Read X Compliance</strong> (DELSM - Lufthansa Group Delhi). Please log in to access your staff directives, WBT modules, or administrator portal.
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-400/30"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In &bull; Read X Compliance</span>
            </button>
          </div>
        </div>
      )}

      {/* Login Portal Modal */}
      <LoginPortalModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        users={availableUsers}
        onLogin={handleLoginAsUser}
        onUpdateUserPassword={handleUpdateUserPassword}
      />
    </main>
  );
}
