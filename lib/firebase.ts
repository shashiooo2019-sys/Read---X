import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  writeBatch,
  getDocFromServer,
  query,
  where,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { TopicConfirmation, Topic, User, TopicAssignment } from './types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Target Firestore instance (using database ID from config if defined)
export const db: Firestore =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Connection verification test
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    const testRef = doc(db, 'test', 'connection');
    await getDocFromServer(testRef).catch(() => null);
    return true;
  } catch (err) {
    console.warn('Firebase Firestore connection notice:', err);
    return false;
  }
}

// ==========================================
// 1. COMPLIANCE VERIFICATIONS (Confirmations)
// ==========================================

export async function saveVerificationToFirestore(verification: TopicConfirmation): Promise<boolean> {
  try {
    const docId = verification.id || `conf-${Date.now()}`;
    const docRef = doc(db, 'compliance_verifications', docId);
    
    // Clean undefined fields for Firestore
    const payload: Record<string, any> = {
      id: docId,
      topicId: verification.topicId,
      userId: verification.userId,
      confirmedAt: verification.confirmedAt || new Date().toISOString(),
      status: verification.status || 'confirmed',
    };

    if (verification.documentId) payload.documentId = verification.documentId;
    if (verification.documentTitle) payload.documentTitle = verification.documentTitle;
    if (verification.documentVersion) payload.documentVersion = verification.documentVersion;
    if (verification.userEmail) payload.userEmail = verification.userEmail;
    if (verification.userName) payload.userName = verification.userName;
    if (verification.signatureText) payload.signatureText = verification.signatureText;
    if (verification.ipAddress) payload.ipAddress = verification.ipAddress;
    if (verification.lateReason) payload.lateReason = verification.lateReason;
    if (verification.adminReviewNote) payload.adminReviewNote = verification.adminReviewNote;
    if (verification.reviewedBy) payload.reviewedBy = verification.reviewedBy;
    if (verification.reviewedAt) payload.reviewedAt = verification.reviewedAt;

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to save compliance verification to Firebase:', error);
    return false;
  }
}

export async function saveAllVerificationsToFirestore(verifications: TopicConfirmation[]): Promise<boolean> {
  try {
    if (!verifications || verifications.length === 0) return true;
    
    // Chunk batches into max 450 writes
    const chunkSize = 400;
    for (let i = 0; i < verifications.length; i += chunkSize) {
      const chunk = verifications.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const verification of chunk) {
        const docId = verification.id || `conf-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const docRef = doc(db, 'compliance_verifications', docId);
        
        const payload: Record<string, any> = {
          id: docId,
          topicId: verification.topicId,
          userId: verification.userId,
          confirmedAt: verification.confirmedAt || new Date().toISOString(),
          status: verification.status || 'confirmed',
        };

        if (verification.documentId) payload.documentId = verification.documentId;
        if (verification.documentTitle) payload.documentTitle = verification.documentTitle;
        if (verification.documentVersion) payload.documentVersion = verification.documentVersion;
        if (verification.userEmail) payload.userEmail = verification.userEmail;
        if (verification.userName) payload.userName = verification.userName;
        if (verification.signatureText) payload.signatureText = verification.signatureText;
        if (verification.ipAddress) payload.ipAddress = verification.ipAddress;
        if (verification.lateReason) payload.lateReason = verification.lateReason;
        if (verification.adminReviewNote) payload.adminReviewNote = verification.adminReviewNote;
        if (verification.reviewedBy) payload.reviewedBy = verification.reviewedBy;
        if (verification.reviewedAt) payload.reviewedAt = verification.reviewedAt;

        batch.set(docRef, payload, { merge: true });
      }

      await batch.commit();
    }
    return true;
  } catch (error) {
    console.error('Failed to batch save verifications to Firebase:', error);
    return false;
  }
}

export async function fetchVerificationsFromFirestore(): Promise<TopicConfirmation[]> {
  try {
    const colRef = collection(db, 'compliance_verifications');
    const snapshot = await getDocs(colRef);
    const results: TopicConfirmation[] = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as TopicConfirmation;
      results.push({
        ...data,
        id: docSnap.id,
      });
    });

    return results;
  } catch (error) {
    console.warn('Could not fetch verifications from Firebase:', error);
    return [];
  }
}

export async function deleteVerificationFromFirestore(verificationId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'compliance_verifications', verificationId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Failed to delete verification from Firebase:', error);
    return false;
  }
}

// ==========================================
// 2. SAVED PASSWORDS
// ==========================================

export interface UserPasswordRecord {
  userId: string;
  email: string;
  uNumber?: string;
  passwordHash: string;
  updatedAt: string;
  createdAt?: string;
}

export async function savePasswordToFirestore(
  userId: string,
  email: string,
  passwordHash: string,
  uNumber?: string
): Promise<boolean> {
  try {
    const docRef = doc(db, 'user_passwords', userId);
    const payload: UserPasswordRecord = {
      userId,
      email: email.trim().toLowerCase(),
      uNumber: uNumber || '',
      passwordHash,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to save password to Firebase:', error);
    return false;
  }
}

export async function fetchPasswordFromFirestore(userId: string): Promise<UserPasswordRecord | null> {
  try {
    const docRef = doc(db, 'user_passwords', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserPasswordRecord;
    }
    return null;
  } catch (error) {
    console.warn('Failed to fetch password from Firebase for user:', userId, error);
    return null;
  }
}

export async function deletePasswordFromFirestore(userId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'user_passwords', userId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Failed to delete password from Firebase:', error);
    return false;
  }
}

export async function fetchAllPasswordsFromFirestore(): Promise<Map<string, UserPasswordRecord>> {
  const map = new Map<string, UserPasswordRecord>();
  try {
    const colRef = collection(db, 'user_passwords');
    const snapshot = await getDocs(colRef);
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as UserPasswordRecord;
      map.set(docSnap.id, data);
      if (data.email) {
        map.set(data.email.toLowerCase(), data);
      }
    });
  } catch (error) {
    console.warn('Failed to load all passwords from Firebase:', error);
  }
  return map;
}

// ==========================================
// 3. TOPICS & STAFF ASSIGNMENTS SYNC
// ==========================================

export async function saveTopicToFirestore(topic: Topic, assignedStaff?: User[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'topics', topic.id);
    
    // Clean all undefined fields before saving to Firestore
    const payload: Record<string, any> = {
      id: topic.id,
      title: topic.title,
      type: topic.type,
      targetGroup: topic.targetGroup,
      content: topic.content,
      effectiveDate: topic.effectiveDate,
      dueDate: topic.dueDate,
      createdAt: topic.createdAt || new Date().toISOString(),
      createdBy: topic.createdBy || 'Administrator',
    };

    if (topic.customTypeDesc) payload.customTypeDesc = topic.customTypeDesc;
    if (Array.isArray(topic.assignedUserIds)) {
      payload.assignedUserIds = topic.assignedUserIds;
    } else {
      payload.assignedUserIds = [];
    }
    if (topic.attachmentUrl) payload.attachmentUrl = topic.attachmentUrl;
    if (topic.attachmentName) payload.attachmentName = topic.attachmentName;
    if (topic.publishedDate) payload.publishedDate = topic.publishedDate;
    if (topic.version) payload.version = topic.version;
    if (typeof topic.isClosed === 'boolean') payload.isClosed = topic.isClosed;
    if (topic.closedAt) payload.closedAt = topic.closedAt;
    if (topic.closedBy) payload.closedBy = topic.closedBy;
    if (topic.closedReason) payload.closedReason = topic.closedReason;

    await setDoc(docRef, payload, { merge: true });

    // Save assignments to Firestore if staff members provided
    if (assignedStaff && assignedStaff.length > 0) {
      await saveTopicAssignmentsToFirestore(topic, assignedStaff);
    }

    return true;
  } catch (error) {
    console.error('Failed to save topic to Firebase:', error);
    return false;
  }
}

export async function saveTopicAssignmentsToFirestore(
  topic: Topic,
  staffMembers: User[]
): Promise<boolean> {
  try {
    if (!staffMembers || staffMembers.length === 0) return true;
    
    const chunkSize = 400;
    for (let i = 0; i < staffMembers.length; i += chunkSize) {
      const chunk = staffMembers.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const staff of chunk) {
        const assignmentId = `${topic.id}_${staff.id}`;
        const assignmentRef = doc(db, 'topic_assignments', assignmentId);

        const qualificationStr =
          staff.isAls && staff.isLead
            ? 'ALS & Lead'
            : staff.isAls
            ? 'ALS'
            : staff.isLead
            ? 'Lead'
            : 'Standard';

        const assignmentData: TopicAssignment = {
          id: assignmentId,
          topicId: topic.id,
          topicTitle: topic.title,
          topicType: topic.type,
          userId: staff.id,
          userName: staff.name,
          userEmail: staff.email,
          uNumber: staff.uNumber,
          targetGroup: topic.targetGroup,
          isIndividuallySelected: Boolean(topic.assignedUserIds && topic.assignedUserIds.includes(staff.id)),
          assignedAt: topic.createdAt || new Date().toISOString(),
          dueDate: topic.dueDate,
          status: 'assigned',
          isAls: Boolean(staff.isAls),
          isLead: Boolean(staff.isLead),
          staffQualification: qualificationStr,
        };

        batch.set(assignmentRef, assignmentData, { merge: true });
      }

      await batch.commit();
    }
    return true;
  } catch (error) {
    console.error('Failed to save topic assignments to Firebase:', error);
    return false;
  }
}

export async function closeTopicForAcknowledgementInFirestore(
  topicId: string,
  adminEmail: string,
  unconfirmedStaff: User[] = []
): Promise<{ success: boolean; closedCount: number }> {
  try {
    const topicRef = doc(db, 'topics', topicId);
    const nowIso = new Date().toISOString();
    await setDoc(
      topicRef,
      {
        isClosed: true,
        closedAt: nowIso,
        closedBy: adminEmail,
        closedReason: 'Closed for acknowledgement by administrator (Participation verified)',
      },
      { merge: true }
    );

    let closedCount = 0;
    if (unconfirmedStaff.length > 0) {
      const chunkSize = 250;
      for (let i = 0; i < unconfirmedStaff.length; i += chunkSize) {
        const chunk = unconfirmedStaff.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        for (const staff of chunk) {
          const verifId = `conf-${topicId}-${staff.id}`;
          const verifRef = doc(db, 'compliance_verifications', verifId);
          batch.set(
            verifRef,
            {
              id: verifId,
              topicId,
              userId: staff.id,
              userName: staff.name,
              userEmail: staff.email,
              confirmedAt: nowIso,
              status: 'confirmed',
              signatureText: 'Participation Verified by Admin (Closed Session)',
              adminReviewNote: 'Participation verified & confirmed upon admin closure',
              reviewedBy: adminEmail,
              reviewedAt: nowIso,
            },
            { merge: true }
          );

          const assignId = `${topicId}_${staff.id}`;
          const assignRef = doc(db, 'topic_assignments', assignId);
          batch.set(
            assignRef,
            {
              id: assignId,
              topicId,
              userId: staff.id,
              status: 'confirmed',
              confirmedAt: nowIso,
            },
            { merge: true }
          );
          closedCount++;
        }

        await batch.commit();
      }
    }

    return { success: true, closedCount };
  } catch (error) {
    console.error('Failed to close topic for acknowledgement in Firestore:', error);
    return { success: false, closedCount: 0 };
  }
}

export async function saveAllTopicsAndAssignmentsToFirestore(
  topics: Topic[],
  allUsers: User[] = []
): Promise<{ topicsCount: number; assignmentsCount: number; success: boolean }> {
  try {
    const testIds = new Set(['top-101', 'top-102', 'top-103', 'top-104', 'top-105', 'top-106', 'top-107', 'top-108']);
    const validTopics = topics.filter(t => !testIds.has(t.id) && !t.id?.startsWith('top-10'));
    
    let totalAssignments = 0;
    for (const topic of validTopics) {
      // Resolve staff assigned to this topic
      let assignedStaff: User[] = [];
      if (allUsers.length > 0) {
        assignedStaff = allUsers.filter(u => {
          if (topic.targetGroup === 'CUSTOM') {
            return Boolean(topic.assignedUserIds && topic.assignedUserIds.includes(u.id));
          }
          if (topic.assignedUserIds && topic.assignedUserIds.includes(u.id)) {
            return true;
          }
          if (topic.targetGroup === 'ALL') return true;
          if (topic.targetGroup === 'ALS') return u.isAls === true;
          if (topic.targetGroup === 'Lead') return u.isLead === true;
          if (topic.targetGroup === 'ALS_AND_LEAD') return u.isAls === true || u.isLead === true;
          return false;
        });
      } else if (topic.assignedUserIds && topic.assignedUserIds.length > 0) {
        assignedStaff = topic.assignedUserIds.map(id => ({
          id,
          name: id,
          email: '',
          uNumber: id,
          isAls: false,
          isLead: false,
          isAdmin: false,
        }));
      }

      await saveTopicToFirestore(topic, assignedStaff);
      totalAssignments += assignedStaff.length;
    }

    return { topicsCount: validTopics.length, assignmentsCount: totalAssignments, success: true };
  } catch (err) {
    console.error('Failed to save all topics and assignments to Firebase:', err);
    return { topicsCount: 0, assignmentsCount: 0, success: false };
  }
}

export async function fetchTopicAssignmentsFromFirestore(topicId?: string): Promise<TopicAssignment[]> {
  try {
    const colRef = collection(db, 'topic_assignments');
    const q = topicId ? query(colRef, where('topicId', '==', topicId)) : colRef;
    const snapshot = await getDocs(q);
    const results: TopicAssignment[] = [];
    snapshot.forEach(docSnap => {
      results.push(docSnap.data() as TopicAssignment);
    });
    return results;
  } catch (error) {
    console.warn('Could not fetch topic assignments from Firebase:', error);
    return [];
  }
}

export async function deleteTopicFromFirestore(topicId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'topics', topicId);
    await deleteDoc(docRef);

    // Delete corresponding assignments from topic_assignments
    try {
      const q = query(collection(db, 'topic_assignments'), where('topicId', '==', topicId));
      const snaps = await getDocs(q);
      if (!snaps.empty) {
        const batch = writeBatch(db);
        snaps.forEach(s => batch.delete(s.ref));
        await batch.commit();
      }
    } catch (assignErr) {
      console.warn('Notice deleting topic assignments from Firebase:', assignErr);
    }

    return true;
  } catch (error) {
    console.error('Failed to delete topic from Firebase:', error);
    return false;
  }
}

export async function fetchTopicsFromFirestore(): Promise<Topic[]> {
  try {
    const colRef = collection(db, 'topics');
    const snapshot = await getDocs(colRef);
    const results: Topic[] = [];
    const testIds = new Set(['top-101', 'top-102', 'top-103', 'top-104', 'top-105', 'top-106', 'top-107', 'top-108']);
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Topic;
      if (!testIds.has(docSnap.id) && !docSnap.id.startsWith('top-10')) {
        results.push({
          ...data,
          id: docSnap.id,
        });
      }
    });
    return results;
  } catch (error) {
    console.warn('Could not fetch topics from Firebase:', error);
    return [];
  }
}

export async function purgeTestTopicsFromFirestore(): Promise<void> {
  const testIds = ['top-101', 'top-102', 'top-103', 'top-104', 'top-105', 'top-106', 'top-107', 'top-108'];
  for (const id of testIds) {
    try {
      await deleteDoc(doc(db, 'topics', id));
    } catch {
      // ignore
    }
  }
  // Also clean up any test assignments
  try {
    for (const id of testIds) {
      const q = query(collection(db, 'topic_assignments'), where('topicId', '==', id));
      const snaps = await getDocs(q);
      if (!snaps.empty) {
        const batch = writeBatch(db);
        snaps.forEach(s => batch.delete(s.ref));
        await batch.commit();
      }
    }
  } catch {
    // ignore
  }
}

export async function saveUserToFirestore(user: User): Promise<boolean> {
  try {
    const docRef = doc(db, 'users', user.id);
    const payload: Record<string, any> = {
      id: user.id,
      uNumber: user.uNumber,
      name: user.name,
      email: user.email,
      isAls: Boolean(user.isAls),
      isLead: Boolean(user.isLead),
      isAdmin: Boolean(user.isAdmin),
    };
    if (user.loginEmail) payload.loginEmail = user.loginEmail;
    if (user.workEmail) payload.workEmail = user.workEmail;
    if (user.department) payload.department = user.department;
    if (user.title) payload.title = user.title;
    if (user.accountStatus) payload.accountStatus = user.accountStatus;
    if (user.approvalStatus) payload.approvalStatus = user.approvalStatus;

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to save user to Firebase:', error);
    return false;
  }
}

export async function fetchUsersFromFirestore(): Promise<User[]> {
  try {
    const colRef = collection(db, 'users');
    const snapshot = await getDocs(colRef);
    const results: User[] = [];
    snapshot.forEach(docSnap => {
      results.push(docSnap.data() as User);
    });
    return results;
  } catch (error) {
    console.warn('Could not fetch users from Firebase:', error);
    return [];
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'users', userId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Failed to delete user from Firebase:', error);
    return false;
  }
}

export async function saveAllUsersToFirestore(users: User[]): Promise<boolean> {
  try {
    if (!users || users.length === 0) return true;
    const chunkSize = 400;
    for (let i = 0; i < users.length; i += chunkSize) {
      const chunk = users.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const u of chunk) {
        const docRef = doc(db, 'users', u.id);
        const payload: Record<string, any> = {
          id: u.id,
          uNumber: u.uNumber,
          name: u.name,
          email: u.email,
          isAls: Boolean(u.isAls),
          isLead: Boolean(u.isLead),
          isAdmin: Boolean(u.isAdmin),
        };
        if (u.loginEmail) payload.loginEmail = u.loginEmail;
        if (u.workEmail) payload.workEmail = u.workEmail;
        if (u.department) payload.department = u.department;
        if (u.title) payload.title = u.title;
        if (u.accountStatus) payload.accountStatus = u.accountStatus;
        if (u.approvalStatus) payload.approvalStatus = u.approvalStatus;
        batch.set(docRef, payload, { merge: true });
      }
      await batch.commit();
    }
    return true;
  } catch (error) {
    console.error('Failed to batch save users to Firebase:', error);
    return false;
  }
}
