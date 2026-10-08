'use client';

import React, { useState, useEffect } from 'react';
import { User, Topic, TopicConfirmation } from '@/lib/types';
import { INITIAL_STAFF_ROSTER } from '@/lib/roster-data';
import { INITIAL_TOPICS, generateInitialConfirmations } from '@/lib/initial-topics';
import {
  getStoredUsers,
  saveUsers,
  getStoredTopics,
  saveTopics,
  getStoredConfirmations,
  saveConfirmations,
  getCurrentUserId,
  setCurrentUserId,
  resetToDefaults,
} from '@/lib/compliance-store';
import { GoogleLogin } from '@/components/auth/google-login';
import { TopBar } from '@/components/navigation/top-bar';
import { UserDashboard } from '@/components/user/user-dashboard';
import { AdminConsole } from '@/components/admin/admin-console';
import { StaffRosterView } from '@/components/admin/staff-roster-view';
import { ReportsView } from '@/components/admin/reports-view';

export default function Home() {
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [users, setUsers] = useState<User[]>(() => getStoredUsers());
  const [topics, setTopics] = useState<Topic[]>(() => getStoredTopics());
  const [confirmations, setConfirmations] = useState<TopicConfirmation[]>(() => getStoredConfirmations());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deviceLockedEmail, setDeviceLockedEmail] = useState<string | null>(null);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-compliance' | 'admin-console' | 'staff-roster' | 'reports'>('my-compliance');

  // Verify server session on load (Requirement 4 & 11: Never trust client-only state)
  useEffect(() => {
    async function checkServerSession() {
      try {
        const res = await fetch('/api/auth/session');
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
            setCurrentUserId(data.user.id);
          } else {
            setCurrentUser(null);
            setCurrentUserId(null);
          }
          if (data.deviceLockedEmail) {
            setDeviceLockedEmail(data.deviceLockedEmail);
          }
        }
      } catch (err) {
        console.error('Failed to verify session on server', err);
      } finally {
        setSessionChecking(false);
      }
    }
    checkServerSession();
  }, []);

  // Listen to external data changes if any
  useEffect(() => {
    const handleDataChanged = () => {
      setUsers(getStoredUsers());
      setTopics(getStoredTopics());
      setConfirmations(getStoredConfirmations());
    };
    window.addEventListener('read_and_sign_data_changed', handleDataChanged);
    return () => window.removeEventListener('read_and_sign_data_changed', handleDataChanged);
  }, []);

  // Login handler
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentUserId(user.id);
    setDeviceLockedEmail(user.email);
    setActiveTab('my-compliance');
  };

  // Logout handler (Session cleared on server, device remains bound)
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.deviceLockedEmail) {
          setDeviceLockedEmail(data.deviceLockedEmail);
        }
      }
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setCurrentUserId(null);
    setActiveTab('my-compliance');
  };

  // Switch active user
  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    setCurrentUserId(user.id);
  };

  // Toggle current user admin privilege
  const handleToggleCurrentUserAdmin = () => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, isAdmin: !currentUser.isAdmin };
    const updatedUsers = users.map(u => (u.id === currentUser.id ? updatedUser : u));
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setCurrentUser(updatedUser);
  };

  // Toggle any user's admin privilege
  const handleToggleAdmin = (userId: string) => {
    const updatedUsers = users.map(u => (u.id === userId ? { ...u, isAdmin: !u.isAdmin } : u));
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => (prev ? { ...prev, isAdmin: !prev.isAdmin } : null));
    }
  };

  // Create new compliance topic
  const handleCreateTopic = (newTopicData: Omit<Topic, 'id' | 'createdAt'>) => {
    const newTopic: Topic = {
      ...newTopicData,
      id: `top-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTopic, ...topics];
    setTopics(updated);
    saveTopics(updated);
  };

  // Delete topic
  const handleDeleteTopic = (topicId: string) => {
    const updatedTopics = topics.filter(t => t.id !== topicId);
    const updatedConfirmations = confirmations.filter(c => c.topicId !== topicId);
    setTopics(updatedTopics);
    setConfirmations(updatedConfirmations);
    saveTopics(updatedTopics);
    saveConfirmations(updatedConfirmations);
  };

  // Add staff member
  const handleAddStaff = (newStaff: User) => {
    const updated = [...users, newStaff];
    setUsers(updated);
    saveUsers(updated);
  };

  // Amend / Update staff member
  const handleUpdateStaff = (updatedStaff: User) => {
    const updated = users.map(u => (u.id === updatedStaff.id ? updatedStaff : u));
    setUsers(updated);
    saveUsers(updated);
    if (currentUser && currentUser.id === updatedStaff.id) {
      setCurrentUser(updatedStaff);
    }
  };

  // Delete staff member
  const handleDeleteStaff = (userId: string) => {
    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    saveUsers(updated);
    // Clean up confirmations for this user
    const updatedConfirmations = confirmations.filter(c => c.userId !== userId);
    setConfirmations(updatedConfirmations);
    saveConfirmations(updatedConfirmations);
  };

  // Bulk update / import staff
  const handleBulkUpdateStaff = (updatedList: User[]) => {
    setUsers(updatedList);
    saveUsers(updatedList);
    if (currentUser) {
      const updatedCurrent = updatedList.find(u => u.id === currentUser.id);
      if (updatedCurrent) {
        setCurrentUser(updatedCurrent);
      }
    }
  };

  // Record user acknowledgment / Read and sign (Requirement 10)
  const handleConfirmTopic = (topicId: string, signatureText: string) => {
    if (!currentUser) return;

    const topic = topics.find(t => t.id === topicId);
    const existingIndex = confirmations.findIndex(c => c.topicId === topicId && c.userId === currentUser.id);

    const newConf: TopicConfirmation = {
      id: `conf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      topicId,
      documentId: topicId,
      documentTitle: topic ? topic.title : topicId,
      documentVersion: topic?.version || 'v1.0',
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      confirmedAt: new Date().toISOString(),
      status: 'confirmed',
      signatureText: currentUser.name,
      ipAddress: '10.240.12.88',
    };

    let updated: TopicConfirmation[];
    if (existingIndex >= 0) {
      // Replaced old confirmation (e.g. after re-sign due to version change)
      updated = [...confirmations];
      updated[existingIndex] = newConf;
    } else {
      updated = [newConf, ...confirmations];
    }

    setConfirmations(updated);
    saveConfirmations(updated);
  };

  if (!mounted || sessionChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#0078D4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not logged in, display Google login
  if (!currentUser) {
    return (
      <GoogleLogin
        onLoginSuccess={handleLoginSuccess}
        deviceLockedEmail={deviceLockedEmail}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navigation conforming to Top Bar Contract */}
      <TopBar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab)}
        onLogout={handleLogout}
        onToggleCurrentUserAdmin={handleToggleCurrentUserAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'my-compliance' && (
          <UserDashboard
            currentUser={currentUser}
            topics={topics}
            confirmations={confirmations}
            onConfirmTopic={handleConfirmTopic}
            onOpenAdminConsole={currentUser.isAdmin ? () => setActiveTab('admin-console') : undefined}
          />
        )}

        {activeTab === 'admin-console' && (
          <AdminConsole
            users={users}
            topics={topics}
            confirmations={confirmations}
            currentUser={currentUser}
            onCreateTopic={handleCreateTopic}
            onDeleteTopic={handleDeleteTopic}
            onNavigateToRoster={() => setActiveTab('staff-roster')}
          />
        )}

        {activeTab === 'staff-roster' && (
          <StaffRosterView
            users={users}
            topics={topics}
            confirmations={confirmations}
            currentUser={currentUser}
            onToggleAdmin={handleToggleAdmin}
            onSwitchUser={handleSwitchUser}
            onAddStaff={handleAddStaff}
            onUpdateStaff={handleUpdateStaff}
            onDeleteStaff={handleDeleteStaff}
            onBulkUpdateStaff={handleBulkUpdateStaff}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            users={users}
            topics={topics}
            confirmations={confirmations}
          />
        )}
      </main>

      {/* Quiet Corporate Footer with system reset capability */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Read & Sign Compliance Management System</span>
            <span aria-hidden="true">·</span>
            <span>M365 Single Sign-On Integrated</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] text-slate-400">
              Station Roster: {users.length} Staff Loaded
            </span>
            <button
              onClick={() => {
                if (window.confirm('Reset all demo topics and confirmations back to initial defaults?')) {
                  resetToDefaults();
                  setUsers(INITIAL_STAFF_ROSTER);
                  setTopics(INITIAL_TOPICS);
                  setConfirmations(generateInitialConfirmations());
                }
              }}
              className="text-slate-400 hover:text-slate-700 underline text-[11px]"
            >
              Reset Demo Data
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
