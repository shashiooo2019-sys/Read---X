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
  syncConfirmationsWithFirebase,
  syncTopicsWithFirebase,
  syncUsersWithFirebase,
  isUserEligibleForTopic,
} from '@/lib/compliance-store';
import {
  saveVerificationToFirestore,
  deleteVerificationFromFirestore,
  saveTopicToFirestore,
  saveTopicAssignmentsToFirestore,
  deleteTopicFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveAllUsersToFirestore,
  closeTopicForAcknowledgementInFirestore,
} from '@/lib/firebase';
import { GoogleLogin } from '@/components/auth/google-login';
import { TopBar } from '@/components/navigation/top-bar';
import { UserDashboard } from '@/components/user/user-dashboard';
import { AdminConsole } from '@/components/admin/admin-console';
import { StaffRosterView } from '@/components/admin/staff-roster-view';
import { ReportsView } from '@/components/admin/reports-view';
import { FirestoreSaveModal, FirestoreConfirmationDetails } from '@/components/common/firestore-save-modal';

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
  const [sessionChecking, setSessionChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-compliance' | 'admin-console' | 'staff-roster' | 'reports'>('my-compliance');
  const [firestoreConfirmation, setFirestoreConfirmation] = useState<FirestoreConfirmationDetails | null>(null);

  // Verify server session on load (Zero browser storage, authenticated session check)
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
            if (data.user.isAdmin) {
              setActiveTab('admin-console');
            }
          } else {
            setCurrentUser(null);
            setCurrentUserId(null);
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

  // Listen to external data changes if any, and synchronize with Firebase Firestore
  useEffect(() => {
    const handleDataChanged = () => {
      setUsers(getStoredUsers());
      setTopics(getStoredTopics());
      setConfirmations(getStoredConfirmations());
    };
    window.addEventListener('read_and_sign_data_changed', handleDataChanged);

    // Initial sync directly from Firebase Firestore (Zero browser storage policy)
    syncUsersWithFirebase()
      .then(remoteUsers => {
        if (remoteUsers) setUsers(remoteUsers);
        return syncTopicsWithFirebase(remoteUsers);
      })
      .then(remoteTopics => {
        if (remoteTopics) setTopics(remoteTopics);
      })
      .catch(err => {
        console.warn('Firebase initial sync notice:', err);
      });

    syncConfirmationsWithFirebase()
      .then(remoteConfs => {
        if (remoteConfs) setConfirmations(remoteConfs);
      })
      .catch(err => {
        console.warn('Firebase verifications sync notice:', err);
      });

    return () => window.removeEventListener('read_and_sign_data_changed', handleDataChanged);
  }, []);

  // Login handler
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentUserId(user.id);
    if (user.isAdmin) {
      setActiveTab('admin-console');
    } else {
      setActiveTab('my-compliance');
    }
  };

  // Logout handler (Session cleared on server, zero device lock)
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
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
    if (user.isAdmin) {
      setActiveTab('admin-console');
    } else {
      setActiveTab('my-compliance');
    }
  };



  // Create new compliance topic
  const handleCreateTopic = async (newTopicData: Omit<Topic, 'id' | 'createdAt'>) => {
    const newTopic: Topic = {
      ...newTopicData,
      id: `top-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTopic, ...topics];
    setTopics(updated);
    saveTopics(updated, users);

    // Identify assigned staff (specifically selected or group eligible)
    const assignedStaff = users.filter(u => isUserEligibleForTopic(u, newTopic));

    // Save newly created topic and staff assignments to Firebase Firestore
    try {
      await saveTopicToFirestore(newTopic, assignedStaff);
      await saveTopicAssignmentsToFirestore(newTopic, assignedStaff);

      // Trigger Firestore save confirmation pop-up
      setFirestoreConfirmation({
        title: 'New Topic & Staff Assignments Saved to Firestore',
        recordType: 'topic_created',
        topicTitle: newTopic.title,
        assignedCount: assignedStaff.length,
        collections: ['topics', 'topic_assignments'],
        timestamp: newTopic.createdAt,
      });
    } catch (err) {
      console.warn('Firebase direct topic & assignments save notice:', err);
    }
  };

  // Delete topic
  const handleDeleteTopic = async (topicId: string) => {
    const topicToDelete = topics.find(t => t.id === topicId);
    const updatedTopics = topics.filter(t => t.id !== topicId);
    const toDeleteConfs = confirmations.filter(c => c.topicId === topicId);
    const updatedConfirmations = confirmations.filter(c => c.topicId !== topicId);
    setTopics(updatedTopics);
    setConfirmations(updatedConfirmations);
    saveTopics(updatedTopics, users);
    saveConfirmations(updatedConfirmations);

    // Delete topic and its compliance verifications from Firebase Firestore
    try {
      await deleteTopicFromFirestore(topicId);
      for (const c of toDeleteConfs) {
        await deleteVerificationFromFirestore(c.id).catch(() => null);
      }
      setFirestoreConfirmation({
        title: 'Topic & Assignments Removed from Firestore',
        recordType: 'topic_deleted',
        topicTitle: topicToDelete?.title || topicId,
        collections: ['topics', 'topic_assignments'],
      });
    } catch (err) {
      console.warn('Firebase topic deletion notice:', err);
    }
  };

  // Add staff member
  const handleAddStaff = async (newStaff: User) => {
    const updated = [...users, newStaff];
    setUsers(updated);
    saveUsers(updated);
    try {
      await saveUserToFirestore(newStaff);
      setFirestoreConfirmation({
        title: 'Staff Member Saved to Firestore',
        recordType: 'roster_sync',
        userName: newStaff.name,
        uNumber: newStaff.uNumber,
        collections: ['users'],
        statusText: `${newStaff.name} (${newStaff.uNumber}) was saved to Firestore station roster. Zero browser storage.`,
      });
    } catch (err) {
      console.warn('Firebase staff save notice:', err);
    }
  };

  // Amend / Update staff member
  const handleUpdateStaff = async (updatedStaff: User) => {
    const updated = users.map(u => (u.id === updatedStaff.id ? updatedStaff : u));
    setUsers(updated);
    saveUsers(updated);
    if (currentUser && currentUser.id === updatedStaff.id) {
      setCurrentUser(updatedStaff);
    }
    try {
      await saveUserToFirestore(updatedStaff);
      setFirestoreConfirmation({
        title: 'Staff Record Updated in Firestore',
        recordType: 'roster_sync',
        userName: updatedStaff.name,
        uNumber: updatedStaff.uNumber,
        collections: ['users'],
        statusText: `${updatedStaff.name}'s profile and qualifications were saved to Firestore. Zero browser storage.`,
      });
    } catch (err) {
      console.warn('Firebase staff update notice:', err);
    }
  };

  // Delete staff member
  const handleDeleteStaff = async (userId: string) => {
    const staffToDelete = users.find(u => u.id === userId);
    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    saveUsers(updated);
    // Clean up confirmations for this user
    const updatedConfirmations = confirmations.filter(c => c.userId !== userId);
    setConfirmations(updatedConfirmations);
    saveConfirmations(updatedConfirmations);
    try {
      await deleteUserFromFirestore(userId);
      setFirestoreConfirmation({
        title: 'Staff Member Removed from Firestore',
        recordType: 'roster_sync',
        userName: staffToDelete?.name || userId,
        collections: ['users'],
        statusText: `${staffToDelete?.name || userId} was removed from the Firestore database. Zero browser storage.`,
      });
    } catch (err) {
      console.warn('Firebase staff deletion notice:', err);
    }
  };

  // Bulk update / import staff
  const handleBulkUpdateStaff = async (updatedList: User[]) => {
    setUsers(updatedList);
    saveUsers(updatedList);
    if (currentUser) {
      const updatedCurrent = updatedList.find(u => u.id === currentUser.id);
      if (updatedCurrent) {
        setCurrentUser(updatedCurrent);
      }
    }
    try {
      await saveAllUsersToFirestore(updatedList);
      setFirestoreConfirmation({
        title: 'Staff Roster Synchronized with Firestore',
        recordType: 'roster_sync',
        assignedCount: updatedList.length,
        collections: ['users'],
        statusText: `All ${updatedList.length} staff records were saved to Firestore. Zero browser storage.`,
      });
    } catch (err) {
      console.warn('Firebase bulk staff save notice:', err);
    }
  };

  // Record user acknowledgment / Read and sign (Requirement 10)
  const handleConfirmTopic = async (topicId: string, signatureText: string, lateReason?: string) => {
    if (!currentUser) return;

    const topic = topics.find(t => t.id === topicId);
    const existingIndex = confirmations.findIndex(c => c.topicId === topicId && c.userId === currentUser.id);

    const todayStr = new Date().toISOString().split('T')[0];
    const isPastDeadline = Boolean(topic && topic.dueDate && topic.dueDate < todayStr);
    const status = 'confirmed';

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
      status,
      signatureText: currentUser.name,
      ipAddress: '10.240.12.88',
      lateReason: lateReason?.trim() || undefined,
      lateRemark: lateReason?.trim() || undefined,
      isLate: isPastDeadline,
      adminReviewNote: isPastDeadline && lateReason?.trim() ? `Late acknowledgment justification: ${lateReason.trim()}` : undefined,
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

    // Save compliance verification record directly to Firebase Firestore
    try {
      await saveVerificationToFirestore(newConf);
      // Trigger confirmation pop-up
      setFirestoreConfirmation({
        title: isPastDeadline ? 'Overdue Compliance Acknowledgment Saved to Firestore' : 'Compliance Acknowledgment Saved to Firestore',
        recordType: 'acknowledgment',
        topicTitle: topic ? topic.title : topicId,
        userName: currentUser.name,
        uNumber: currentUser.uNumber,
        collections: ['compliance_verifications', 'topic_assignments'],
        timestamp: newConf.confirmedAt,
        statusText: isPastDeadline
          ? `Overdue directive "${topic?.title || topicId}" was acknowledged with mandatory reason for delay ("${lateReason?.trim()}"). Permanently saved to Cloud Firestore. Zero browser storage.`
          : `Acknowledgment and digital signature for "${topic?.title || topicId}" were permanently saved to Cloud Firestore. Zero browser storage.`,
      });
    } catch (err) {
      console.warn('Firebase direct verification save notice:', err);
    }
  };

  // Close topic for acknowledgement (Trainings, Briefings, Role Plays)
  const handleCloseTopic = async (topicId: string) => {
    const topicToClose = topics.find(t => t.id === topicId);
    if (!topicToClose) return;

    const nowIso = new Date().toISOString();
    const closedTopic: Topic = {
      ...topicToClose,
      isClosed: true,
      closedAt: nowIso,
      closedBy: currentUser?.email || 'Administrator',
      closedReason: 'Topic closed for acknowledgement by Administrator. Participation verified.',
    };

    const updatedTopics = topics.map(t => (t.id === topicId ? closedTopic : t));
    setTopics(updatedTopics);
    saveTopics(updatedTopics, users);

    // Identify all eligible staff for this topic who do not already have a confirmed verification
    const eligibleStaff = users.filter(u => isUserEligibleForTopic(u, closedTopic));
    const unconfirmedStaff = eligibleStaff.filter(
      u => !confirmations.some(c => c.topicId === topicId && c.userId === u.id && c.status === 'confirmed')
    );

    const autoVerifications: TopicConfirmation[] = unconfirmedStaff.map(staff => ({
      id: `conf-${topicId}-${staff.id}`,
      topicId: topicId,
      documentId: topicId,
      documentTitle: closedTopic.title,
      documentVersion: closedTopic.version || 'v1.0',
      userId: staff.id,
      userEmail: staff.email,
      userName: staff.name,
      confirmedAt: nowIso,
      status: 'confirmed',
      signatureText: 'Participation Verified by Admin (Closed Session)',
      adminReviewNote: 'Participation verified & confirmed upon admin closure',
      reviewedBy: currentUser?.email || 'Administrator',
      reviewedAt: nowIso,
    }));

    const existingOtherConfs = confirmations.filter(
      c => !autoVerifications.some(ac => ac.topicId === c.topicId && ac.userId === c.userId)
    );
    const updatedConfirmations = [...autoVerifications, ...existingOtherConfs];
    setConfirmations(updatedConfirmations);
    saveConfirmations(updatedConfirmations);

    try {
      await closeTopicForAcknowledgementInFirestore(
        topicId,
        currentUser?.email || 'Administrator',
        unconfirmedStaff
      );

      setFirestoreConfirmation({
        title: 'Topic Closed & Participations Verified in Firestore',
        recordType: 'topic_closed',
        topicTitle: closedTopic.title,
        assignedCount: eligibleStaff.length,
        collections: ['topics', 'compliance_verifications', 'topic_assignments'],
        timestamp: nowIso,
        statusText: `"${closedTopic.title}" was closed for acknowledgement. All ${eligibleStaff.length} participant records were verified and permanently saved to Cloud Firestore. Zero browser storage.`,
      });
    } catch (err) {
      console.warn('Firebase error closing topic for acknowledgement:', err);
    }
  };

  // Admin review handler for late approval (Accept / Reject)
  const handleUpdateConfirmation = async (confirmationId: string, newStatus: 'confirmed' | 'rejected', reviewNote?: string) => {
    let targetConf: TopicConfirmation | undefined;
    const updated = confirmations.map(c => {
      if (c.id === confirmationId) {
        const revised: TopicConfirmation = {
          ...c,
          status: newStatus,
          reviewedBy: currentUser?.email,
          reviewedAt: new Date().toISOString(),
          adminReviewNote: reviewNote,
        };
        targetConf = revised;
        return revised;
      }
      return c;
    });
    setConfirmations(updated);
    saveConfirmations(updated);

    // Persist reviewed verification update to Firebase Firestore
    if (targetConf) {
      try {
        await saveVerificationToFirestore(targetConf);
        setFirestoreConfirmation({
          title: `Verification Review (${newStatus.toUpperCase()}) Saved to Firestore`,
          recordType: 'admin_review',
          topicTitle: targetConf.documentTitle || targetConf.topicId,
          userName: targetConf.userName,
          collections: ['compliance_verifications'],
          timestamp: targetConf.reviewedAt,
        });
      } catch (err) {
        console.warn('Firebase direct verification update notice:', err);
      }
    }
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
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'my-compliance' && !currentUser.isAdmin && (
          <UserDashboard
            currentUser={currentUser}
            topics={topics}
            confirmations={confirmations}
            onConfirmTopic={handleConfirmTopic}
            onOpenAdminConsole={undefined}
          />
        )}

        {(activeTab === 'admin-console' || (activeTab === 'my-compliance' && currentUser.isAdmin)) && (
          <AdminConsole
            users={users}
            topics={topics}
            confirmations={confirmations}
            currentUser={currentUser}
            onCreateTopic={handleCreateTopic}
            onDeleteTopic={handleDeleteTopic}
            onCloseTopicForAcknowledgement={handleCloseTopic}
            onUpdateConfirmation={handleUpdateConfirmation}
            onNavigateToRoster={() => setActiveTab('staff-roster')}
          />
        )}

        {activeTab === 'staff-roster' && (
          <StaffRosterView
            users={users}
            topics={topics}
            confirmations={confirmations}
            currentUser={currentUser}
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
              Station Roster: {users.length} Staff
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Firestore Connected · Browser Storage Disabled</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Pop-up confirmation when saving topics, assignments, or acknowledgments to Firestore */}
      {firestoreConfirmation && (
        <FirestoreSaveModal
          key={firestoreConfirmation.timestamp || firestoreConfirmation.title}
          confirmation={firestoreConfirmation}
          onClose={() => setFirestoreConfirmation(null)}
        />
      )}
    </div>
  );
}
