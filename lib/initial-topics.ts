import { Topic, TopicConfirmation } from './types';

// All test topics deleted as requested. New topics created by administrators will be stored in Firebase Firestore.
export const INITIAL_TOPICS: Topic[] = [];

// No initial confirmations since test topics have been removed
export function generateInitialConfirmations(): TopicConfirmation[] {
  return [];
}
