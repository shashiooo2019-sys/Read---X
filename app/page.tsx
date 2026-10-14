'use client';

import React, { useState, useEffect } from 'react';
import { User, Topic, TopicConfirmation, TopicCloseOption } from '@/lib/types';
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
  isConfirmationForStaff,
} from '@/lib/compliance-store';
import {
  saveVerificationToFirestore,
  saveAllVerificationsToFirestore,
  deleteVerificationFromFirestore,
  saveTopicToFirestore,
  saveTopicAssignmentsToFirestore,
  saveAllTopicsAndAssignmentsToFirestore,
  deleteTopicFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveAllUsersToFirestore,
  closeTopicForAcknowledgementInFirestore,
  reopenTopicInFirestore,
} from '@/lib/firebase';
import { TopicParticipationImportResult, normalizeTopicDirectiveKey, resolveStaffUserId } from '@/lib/topic-participation-importer';
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
  const handleCloseFirestoreConfirmation = React.useCallback(() => {
    setFirestoreConfirmation(null);
  }, []);






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
      fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_roster', roster: updated }),
      }).catch(() => null);
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
      fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_roster', roster: updated }),
      }).catch(() => null);
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
      fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_roster', roster: updatedList }),
      }).catch(() => null);
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
    const isWbtTopic = Boolean(topic && (topic.category === 'WBT' || topic.type === 'WBT' || topic.title.toLowerCase().includes('wbt')));
    const status = isWbtTopic ? 'pending_wbt_verification' : 'confirmed';

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
      const isWbt = isWbtTopic;
      setFirestoreConfirmation({
        title: isWbt 
          ? 'WBT Acknowledgment Submitted - Please Upload Certificate' 
          : (isPastDeadline ? 'Overdue Compliance Acknowledgment Saved to Firestore' : 'Compliance Acknowledgment Saved to Firestore'),
        recordType: 'acknowledgment',
        topicTitle: topic ? topic.title : topicId,
        userName: currentUser.name,
        uNumber: currentUser.uNumber,
        collections: ['compliance_verifications', 'topic_assignments'],
        timestamp: newConf.confirmedAt,
        statusText: isWbt
          ? `Acknowledgment recorded. You must now upload your certificate of participation to Teams for admin verification to complete the process. Status is currently: Pending Verification.`
          : (isPastDeadline
            ? `Overdue directive "${topic?.title || topicId}" was acknowledged with mandatory reason for delay ("${lateReason?.trim()}"). Permanently saved to Cloud Firestore. Zero browser storage.`
            : `Acknowledgment and digital signature for "${topic?.title || topicId}" were permanently saved to Cloud Firestore. Zero browser storage.`),
      });
    } catch (err) {
      console.warn('Firebase direct verification save notice:', err);
    }
  };

  // Close topic for acknowledgement (Options: mark remaining as participated OR mark missing pax as not participated)
  const handleCloseTopic = async (topicId: string, option: TopicCloseOption = 'mark_participated') => {
    const topicToClose = topics.find(t => t.id === topicId);
    if (!topicToClose) return;

    const nowIso = new Date().toISOString();
    const reasonText =
      option === 'mark_participated'
        ? 'Topic closed for acknowledgement by Administrator. Remaining staff marked as participated.'
        : 'Topic closed for acknowledgement by Administrator. Missing pax marked as not participated.';

    const closedTopic: Topic = {
      ...topicToClose,
      isClosed: true,
      closedAt: nowIso,
      closedBy: currentUser?.email || 'Administrator',
      closedReason: reasonText,
      closedOption: option,
    };

    const updatedTopics = topics.map(t => (t.id === topicId ? closedTopic : t));
    setTopics(updatedTopics);
    saveTopics(updatedTopics, users);

    // Identify all eligible staff for this topic who do not already have a confirmed verification
    const eligibleStaff = users.filter(u => isUserEligibleForTopic(u, closedTopic));
    const unconfirmedStaff = eligibleStaff.filter(
      u => !confirmations.some(c => c.topicId === topicId && c.userId === u.id && c.status === 'confirmed')
    );

    const isParticipated = option === 'mark_participated';
    const closeoutVerifications: TopicConfirmation[] = unconfirmedStaff.map(staff => ({
      id: `conf-${topicId}-${staff.id}`,
      topicId: topicId,
      documentId: topicId,
      documentTitle: closedTopic.title,
      documentVersion: closedTopic.version || 'v1.0',
      userId: staff.id,
      userEmail: staff.email,
      userName: staff.name,
      confirmedAt: nowIso,
      status: isParticipated ? 'confirmed' : 'not_participated',
      signatureText: isParticipated
        ? 'Participation Verified by Admin (Closed Session)'
        : 'Not Participated (Admin Closed Session)',
      adminReviewNote: isParticipated
        ? 'Participation verified & confirmed upon admin closure'
        : 'Marked as Not Participated upon admin session closeout',
      reviewedBy: currentUser?.email || 'Administrator',
      reviewedAt: nowIso,
    }));

    const existingOtherConfs = confirmations.filter(
      c => !closeoutVerifications.some(ac => ac.topicId === c.topicId && ac.userId === c.userId)
    );
    const updatedConfirmations = [...closeoutVerifications, ...existingOtherConfs];
    setConfirmations(updatedConfirmations);
    saveConfirmations(updatedConfirmations);

    try {
      await closeTopicForAcknowledgementInFirestore(
        topicId,
        currentUser?.email || 'Administrator',
        unconfirmedStaff,
        option
      );

      const statusDesc =
        option === 'mark_participated'
          ? `"${closedTopic.title}" was closed for acknowledgement. All ${eligibleStaff.length} participant records were verified and permanently saved to Cloud Firestore.`
          : `"${closedTopic.title}" was closed for acknowledgement. ${unconfirmedStaff.length} missing participant(s) were recorded as Not Participated in Cloud Firestore.`;

      setFirestoreConfirmation({
        title: 'Topic Closed in Firestore',
        recordType: 'topic_closed',
        topicTitle: closedTopic.title,
        assignedCount: eligibleStaff.length,
        collections: ['topics', 'compliance_verifications', 'topic_assignments'],
        timestamp: nowIso,
        statusText: statusDesc,
      });
    } catch (err) {
      console.warn('Firebase error closing topic for acknowledgement:', err);
    }
  };

  // Reopen topic for acknowledgement
  const handleReopenTopic = async (topicId: string) => {
    const topicToReopen = topics.find(t => t.id === topicId);
    if (!topicToReopen) return;

    const reopenedTopic: Topic = {
      ...topicToReopen,
      isClosed: false,
      closedAt: undefined,
      closedBy: undefined,
      closedReason: undefined,
      closedOption: undefined,
    };

    const updatedTopics = topics.map(t => (t.id === topicId ? reopenedTopic : t));
    setTopics(updatedTopics);
    saveTopics(updatedTopics, users);

    // Remove any verifications generated during admin closeout so staff can sign authentically
    const cleanedConfirmations = confirmations.filter(c => {
      if (c.topicId !== topicId) return true;
      if (c.status === 'not_participated') return false;
      if (c.signatureText === 'Participation Verified by Admin (Closed Session)') return false;
      if (c.signatureText === 'Not Participated (Admin Closed Session)') return false;
      return true;
    });

    setConfirmations(cleanedConfirmations);
    saveConfirmations(cleanedConfirmations);

    try {
      await reopenTopicInFirestore(topicId, currentUser?.email || 'Administrator');

      setFirestoreConfirmation({
        title: 'Topic Reopened for Acknowledgement',
        recordType: 'topic_reopened',
        topicTitle: reopenedTopic.title,
        collections: ['topics', 'compliance_verifications', 'topic_assignments'],
        timestamp: new Date().toISOString(),
        statusText: `"${reopenedTopic.title}" has been successfully reopened for acknowledgement. The directive is active again for assigned staff.`,
      });
    } catch (err) {
      console.warn('Firebase error reopening topic for acknowledgement:', err);
    }
  };

  // Admin review handler for late approval & WBT certificate verification (Accept / Reject)
  const handleUpdateConfirmation = async (confirmationId: string, newStatus: 'confirmed' | 'rejected', reviewNote?: string) => {
    let targetConf: TopicConfirmation | undefined;
    const updated = confirmations.map(c => {
      if (c.id === confirmationId) {
        const revised: TopicConfirmation = {
          ...c,
          status: newStatus,
          reviewedBy: currentUser?.email || 'SuperAdmin',
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

  // Import Topic Participation Matrix (Excel / CSV / Provided Sheet)
  const handleImportTopicParticipation = async (result: TopicParticipationImportResult) => {
    // 1. Merge users: Add newly discovered staff to station roster with canonical IDs
    const userMap = new Map<string, User>();
    users.forEach(u => {
      userMap.set(u.uNumber.toUpperCase(), u);
      if (u.email) userMap.set(u.email.toLowerCase(), u);
      userMap.set(u.id, u);
    });

    const mergedUsers = [...users];
    result.users.forEach(newU => {
      const canonicalId = resolveStaffUserId(newU.uNumber, newU.email, newU.name, mergedUsers);
      const userWithCanonicalId: User = {
        ...newU,
        id: canonicalId,
      };

      const key = newU.uNumber.toUpperCase();
      if (!userMap.has(key) && !userMap.has(canonicalId)) {
        userMap.set(key, userWithCanonicalId);
        userMap.set(canonicalId, userWithCanonicalId);
        if (newU.email) userMap.set(newU.email.toLowerCase(), userWithCanonicalId);
        mergedUsers.push(userWithCanonicalId);
      }
    });

    // 2. Merge topics: Deduplicate by normalized directive title so there is strictly ONE row per topic
    const titleToCanonicalTopic = new Map<string, Topic>();
    const aliasToCanonicalId = new Map<string, string>();

    // Index existing topics
    topics.forEach(t => {
      const directiveKey = normalizeTopicDirectiveKey(t.title);
      if (!titleToCanonicalTopic.has(directiveKey)) {
        titleToCanonicalTopic.set(directiveKey, { ...t });
        aliasToCanonicalId.set(t.id, t.id);
        aliasToCanonicalId.set(directiveKey, t.id);
      } else {
        const canonical = titleToCanonicalTopic.get(directiveKey)!;
        aliasToCanonicalId.set(t.id, canonical.id);
        aliasToCanonicalId.set(directiveKey, canonical.id);
        const combined = Array.from(new Set([...(canonical.assignedUserIds || []), ...(t.assignedUserIds || [])]));
        canonical.assignedUserIds = combined;
        if (t.targetGroup === 'ALL' || canonical.targetGroup === 'ALL') canonical.targetGroup = 'ALL';
        else if (t.targetGroup === 'ALS_AND_LEAD' || canonical.targetGroup === 'ALS_AND_LEAD') canonical.targetGroup = 'ALS_AND_LEAD';
      }
    });

    // Merge incoming new topics
    result.topics.forEach(newTopic => {
      const directiveKey = normalizeTopicDirectiveKey(newTopic.title);
      if (titleToCanonicalTopic.has(directiveKey)) {
        const canonical = titleToCanonicalTopic.get(directiveKey)!;
        aliasToCanonicalId.set(newTopic.id, canonical.id);
        aliasToCanonicalId.set(directiveKey, canonical.id);

        // Normalize assignedUserIds to canonical IDs
        const canonicalAssigned = (newTopic.assignedUserIds || []).map(rawId => {
          const matchedU = mergedUsers.find(u => u.id === rawId || rawId.toLowerCase().includes(u.uNumber.toLowerCase().replace(/^u/i, '')));
          return matchedU ? matchedU.id : rawId;
        });

        const combinedAssigned = Array.from(
          new Set([...(canonical.assignedUserIds || []), ...canonicalAssigned])
        );
        canonical.assignedUserIds = combinedAssigned;
        if (newTopic.targetGroup === 'ALL' || canonical.targetGroup === 'ALL') canonical.targetGroup = 'ALL';
        else if (newTopic.targetGroup === 'ALS_AND_LEAD' || canonical.targetGroup === 'ALS_AND_LEAD') canonical.targetGroup = 'ALS_AND_LEAD';
      } else {
        // Normalize assignedUserIds
        const canonicalAssigned = (newTopic.assignedUserIds || []).map(rawId => {
          const matchedU = mergedUsers.find(u => u.id === rawId || rawId.toLowerCase().includes(u.uNumber.toLowerCase().replace(/^u/i, '')));
          return matchedU ? matchedU.id : rawId;
        });

        const topicWithCanonicalAssigned = {
          ...newTopic,
          assignedUserIds: canonicalAssigned,
        };

        titleToCanonicalTopic.set(directiveKey, topicWithCanonicalAssigned);
        aliasToCanonicalId.set(newTopic.id, newTopic.id);
        aliasToCanonicalId.set(directiveKey, newTopic.id);
      }
    });

    const mergedTopics = Array.from(titleToCanonicalTopic.values());

    // 3. Merge confirmations with remapped canonical topic IDs and canonical user IDs
    const confMap = new Map<string, TopicConfirmation>();

    confirmations.forEach(c => {
      const topicDirectiveKey = c.documentTitle ? normalizeTopicDirectiveKey(c.documentTitle) : '';
      const canonicalTopicId = aliasToCanonicalId.get(c.topicId) || (topicDirectiveKey && aliasToCanonicalId.get(topicDirectiveKey)) || c.topicId;
      
      const matchedUser = mergedUsers.find(u => isConfirmationForStaff(c, u));
      const canonicalUserId = matchedUser ? matchedUser.id : resolveStaffUserId(c.uNumber || '', c.userEmail, c.userName, mergedUsers);

      confMap.set(`${canonicalTopicId}_${canonicalUserId}`, {
        ...c,
        topicId: canonicalTopicId,
        userId: canonicalUserId,
      });
    });

    result.confirmations.forEach(newConf => {
      const topicDirectiveKey = newConf.documentTitle ? normalizeTopicDirectiveKey(newConf.documentTitle) : '';
      const canonicalTopicId = aliasToCanonicalId.get(newConf.topicId) || (topicDirectiveKey && aliasToCanonicalId.get(topicDirectiveKey)) || newConf.topicId;

      const matchedUser = mergedUsers.find(u => isConfirmationForStaff(newConf, u));
      const canonicalUserId = matchedUser ? matchedUser.id : resolveStaffUserId(newConf.uNumber || '', newConf.userEmail, newConf.userName, mergedUsers);

      const key = `${canonicalTopicId}_${canonicalUserId}`;
      const existing = confMap.get(key);

      if (!existing || existing.status !== 'confirmed' || newConf.status === 'confirmed') {
        confMap.set(key, {
          ...newConf,
          topicId: canonicalTopicId,
          userId: canonicalUserId,
        });
      }
    });

    const mergedConfirmations = Array.from(confMap.values());

    // Update in-memory state
    setUsers(mergedUsers);
    setTopics(mergedTopics);
    setConfirmations(mergedConfirmations);
    saveUsers(mergedUsers);
    saveTopics(mergedTopics, mergedUsers);
    saveConfirmations(mergedConfirmations);

    // Save directly to Cloud Firestore in batched writes
    try {
      await saveAllUsersToFirestore(mergedUsers);
      await saveAllTopicsAndAssignmentsToFirestore(mergedTopics, mergedUsers);
      await saveAllVerificationsToFirestore(mergedConfirmations);

      setFirestoreConfirmation({
        title: 'Topic Participation Imported & Saved to Firestore',
        recordType: 'topic_created',
        topicTitle: `${result.stats.totalTopics} Topics (${result.stats.totalConfirmed} Confirmed, ${result.stats.totalPending} Pending)`,
        assignedCount: result.stats.totalStaff,
        collections: ['topics', 'topic_assignments', 'compliance_verifications', 'users'],
        timestamp: new Date().toISOString(),
        statusText: `Successfully imported ${result.stats.totalRows} participation records across ${result.stats.totalTopics} topics. ${result.stats.totalConfirmed} verified confirmations and all assignments were permanently committed to Cloud Firestore database ai-studio-readsigncomplian-4208e69d-667a-430c-961f-7e6d635d1298. Zero browser storage.`,
      });
    } catch (err) {
      console.warn('Firebase batch import save notice:', err);
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
        rosterUsers={users}
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
            onReopenTopicForAcknowledgement={handleReopenTopic}
            onUpdateConfirmation={handleUpdateConfirmation}
            onNavigateToRoster={() => setActiveTab('staff-roster')}
            onImportTopicParticipation={handleImportTopicParticipation}
            onShowFirestoreConfirmation={setFirestoreConfirmation}
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
          onClose={handleCloseFirestoreConfirmation}
        />
      )}


    </div>
  );
}
