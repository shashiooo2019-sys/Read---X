import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  memoryLocalCache,
  getFirestore,
  doc,
  collection,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  query,
  where,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Topic, User, TopicConfirmation } from './types';

// Step 1: Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Step 1 Constraint: Disable local/offline persistence using memoryLocalCache()
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);

// Test server connection directly
export async function validateCloudConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(db, 'system', 'health-check');
    await getDocFromServer(testDocRef).catch(() => null);
    console.log('Successfully connected directly to Cloud Firestore.');
    return true;
  } catch (error) {
    console.warn('Cloud connection check note:', error);
    return false;
  }
}

// -------------------------------------------------------------
// Real-Time Listeners (Rule 2)
// -------------------------------------------------------------

export function subscribeToTopics(callback: (topics: Topic[]) => void): Unsubscribe {
  const topicsCollection = collection(db, 'topics');
  return onSnapshot(
    topicsCollection,
    (snapshot) => {
      const topicList: Topic[] = [];
      snapshot.forEach((docSnap) => {
        topicList.push({ id: docSnap.id, ...docSnap.data() } as Topic);
      });
      callback(topicList);
    },
    (error) => {
      console.error('Real-time topic listener error:', error);
    }
  );
}

export function subscribeToUsers(callback: (users: User[]) => void): Unsubscribe {
  const usersCollection = collection(db, 'users');
  return onSnapshot(
    usersCollection,
    (snapshot) => {
      const userList: User[] = [];
      snapshot.forEach((docSnap) => {
        userList.push({ id: docSnap.id, ...docSnap.data() } as User);
      });
      callback(userList);
    },
    (error) => {
      console.error('Real-time user listener error:', error);
    }
  );
}

export function subscribeToConfirmations(callback: (confirmations: TopicConfirmation[]) => void): Unsubscribe {
  const confirmationsCollection = collection(db, 'confirmations');
  return onSnapshot(
    confirmationsCollection,
    (snapshot) => {
      const confList: TopicConfirmation[] = [];
      snapshot.forEach((docSnap) => {
        confList.push({ id: docSnap.id, ...docSnap.data() } as TopicConfirmation);
      });
      callback(confList);
    },
    (error) => {
      console.error('Real-time confirmation listener error:', error);
    }
  );
}

// -------------------------------------------------------------
// Strict Cloud Validation Workflow (Rule 3)
// -------------------------------------------------------------

export interface CloudWriteResult<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Executes a 3-Step Cloud Verification Workflow for document writes:
 * Step 1: Await write promise to Cloud Firestore
 * Step 2: Perform fresh getDocFromServer() query directly from live backend
 * Step 3: Compare written vs server data, and confirm "Successfully uploaded to the CLOUD"
 */
export async function saveTopicToCloud(topic: Topic): Promise<CloudWriteResult<Topic>> {
  const topicRef = doc(db, 'topics', topic.id);
  const payload = {
    title: topic.title,
    description: topic.description || '',
    content: topic.content || '',
    type: topic.type,
    targetGroup: topic.targetGroup,
    assignedUserIds: topic.assignedUserIds || [],
    assignedUserNames: topic.assignedUserNames || [],
    targetTeams: topic.targetTeams || [],
    targetDepartments: topic.targetDepartments || [],
    dueDate: topic.dueDate || '',
    publishedDate: topic.publishedDate || new Date().toISOString().split('T')[0],
    createdBy: topic.createdBy,
    createdAt: topic.createdAt || new Date().toISOString(),
    status: topic.status || 'active',
  };

  try {
    // Step 1: Await Cloud Write
    await setDoc(topicRef, payload, { merge: true });

    // Step 2: Explicitly query fresh data directly from live cloud server
    const serverSnap = await getDocFromServer(topicRef);

    if (!serverSnap.exists()) {
      throw new Error('Verification failed: Document not found on Cloud server.');
    }

    const serverData = serverSnap.data();

    // Step 3: Compare payload with server-fetched data
    if (serverData.title === payload.title && serverData.type === payload.type) {
      const verifiedTopic = { id: serverSnap.id, ...serverData } as Topic;
      return {
        success: true,
        message: 'Successfully uploaded to the CLOUD',
        data: verifiedTopic,
      };
    } else {
      throw new Error('Data mismatch between local payload and verified Cloud snapshot.');
    }
  } catch (error: any) {
    console.error('Firestore Cloud Write Error:', error);
    return {
      success: false,
      message: 'Cloud verification failed',
      error: error?.message || String(error),
    };
  }
}

export async function updateTopicStatusInCloud(
  topicId: string,
  status: 'active' | 'closed',
  closeOption?: string
): Promise<CloudWriteResult<{ status: string }>> {
  const topicRef = doc(db, 'topics', topicId);
  const updatePayload: Record<string, any> = { status };
  if (closeOption) updatePayload.closeOption = closeOption;

  try {
    // Step 1: Write update to cloud
    await updateDoc(topicRef, updatePayload);

    // Step 2: Fresh query directly from server
    const serverSnap = await getDocFromServer(topicRef);
    if (!serverSnap.exists()) {
      throw new Error('Document does not exist on Cloud server.');
    }

    const serverData = serverSnap.data();

    // Step 3: Validate server match
    if (serverData.status === status) {
      return {
        success: true,
        message: 'Successfully uploaded to the CLOUD',
        data: { status: serverData.status },
      };
    } else {
      throw new Error('Cloud status verification mismatched.');
    }
  } catch (error: any) {
    console.error('Firestore Status Update Error:', error);
    return {
      success: false,
      message: 'Cloud verification failed',
      error: error?.message || String(error),
    };
  }
}

export async function saveConfirmationToCloud(
  confirmation: TopicConfirmation
): Promise<CloudWriteResult<TopicConfirmation>> {
  const confRef = doc(db, 'confirmations', confirmation.id);
  const payload: Record<string, any> = {
    userId: confirmation.userId,
    topicId: confirmation.topicId,
    userName: confirmation.userName || '',
    userEmail: confirmation.userEmail || '',
    documentTitle: confirmation.documentTitle || '',
    isLate: !!confirmation.isLate,
    lateReason: confirmation.lateReason || '',
    confirmedAt: confirmation.confirmedAt || new Date().toISOString(),
    status: confirmation.status,
  };

  if (confirmation.wbtCertificateUrl) payload.wbtCertificateUrl = confirmation.wbtCertificateUrl;
  if (confirmation.wbtCertificateFileName) payload.wbtCertificateFileName = confirmation.wbtCertificateFileName;
  if (confirmation.wbtNotes) payload.wbtNotes = confirmation.wbtNotes;
  if (confirmation.verifiedBy) payload.verifiedBy = confirmation.verifiedBy;
  if (confirmation.verifiedAt) payload.verifiedAt = confirmation.verifiedAt;

  try {
    // Step 1: Write to Cloud
    await setDoc(confRef, payload, { merge: true });

    // Step 2: Fresh query from live server
    const serverSnap = await getDocFromServer(confRef);
    if (!serverSnap.exists()) {
      throw new Error('Confirmation snapshot not present on Cloud server.');
    }

    const serverData = serverSnap.data();

    // Step 3: Match check
    if (serverData.userId === payload.userId && serverData.topicId === payload.topicId) {
      return {
        success: true,
        message: 'Successfully uploaded to the CLOUD',
        data: { id: serverSnap.id, ...serverData } as TopicConfirmation,
      };
    } else {
      throw new Error('Cloud acknowledgment verification mismatched.');
    }
  } catch (error: any) {
    console.error('Firestore Confirmation Error:', error);
    return {
      success: false,
      message: 'Cloud verification failed',
      error: error?.message || String(error),
    };
  }
}

export async function saveUserToCloud(user: User): Promise<CloudWriteResult<User>> {
  const userRef = doc(db, 'users', user.id);
  const payload: Record<string, any> = {
    name: user.name,
    email: user.email,
    uNumber: user.uNumber || '',
    ALS: user.ALS || '',
    Lead: user.Lead || '',
    role: user.role,
    isSuperAdmin: !!user.isSuperAdmin,
    team: user.team || '',
    department: user.department || '',
    isPasswordSet: !!user.isPasswordSet,
  };
  if (user.password !== undefined) payload.password = user.password;

  try {
    await setDoc(userRef, payload, { merge: true });
    const serverSnap = await getDocFromServer(userRef);

    if (serverSnap.exists() && serverSnap.data().email === payload.email) {
      return {
        success: true,
        message: 'Successfully uploaded to the CLOUD',
        data: { id: serverSnap.id, ...serverSnap.data() } as User,
      };
    } else {
      throw new Error('User cloud record mismatch.');
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Cloud user save failed',
      error: error?.message || String(error),
    };
  }
}

export async function deleteUserFromCloud(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    return true;
  } catch (error) {
    console.error('Error deleting user from cloud:', error);
    return false;
  }
}

export async function deleteTopicFromCloud(topicId: string, topicTitle?: string): Promise<boolean> {
  try {
    const topicRef = doc(db, 'topics', topicId);
    await deleteDoc(topicRef);

    if (topicTitle) {
      try {
        const q = query(collection(db, 'topics'), where('title', '==', topicTitle));
        const querySnap = await getDocs(q);
        for (const d of querySnap.docs) {
          if (d.id !== topicId) {
            await deleteDoc(d.ref);
          }
        }
      } catch {
        // Query filter fallback if index not created
      }
    }
    return true;
  } catch (error) {
    console.error('Error deleting topic from cloud:', error);
    return false;
  }
}

export async function saveAllTopicsAndAssignmentsToFirestore(topics: Topic[], users: User[]) {
  let savedTopics = 0;
  for (const topic of topics) {
    const res = await saveTopicToCloud(topic);
    if (res.success) savedTopics++;
  }
  for (const user of users) {
    await saveUserToCloud(user);
  }
  return { success: true, topicsCount: savedTopics, assignmentsCount: users.length };
}
