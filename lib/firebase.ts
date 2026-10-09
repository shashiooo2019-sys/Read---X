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
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { TopicConfirmation, Topic, User } from './types';

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
// 3. TOPICS & STAFF SYNC
// ==========================================

export async function saveTopicToFirestore(topic: Topic): Promise<boolean> {
  try {
    const docRef = doc(db, 'topics', topic.id);
    await setDoc(docRef, topic, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to save topic to Firebase:', error);
    return false;
  }
}

export async function deleteTopicFromFirestore(topicId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'topics', topicId);
    await deleteDoc(docRef);
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
}

export async function saveUserToFirestore(user: User): Promise<boolean> {
  try {
    const docRef = doc(db, 'users', user.id);
    await setDoc(docRef, user, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to save user to Firebase:', error);
    return false;
  }
}
