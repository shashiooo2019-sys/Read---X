const { db } = require('./lib/firebase');
const { collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

async function deleteAllUsers() {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  for (const document of snapshot.docs) {
    await deleteDoc(doc(db, 'users', document.id));
    console.log('Deleted user:', document.id);
  }
  console.log('Finished deleting all users.');
}

deleteAllUsers().catch(console.error);
