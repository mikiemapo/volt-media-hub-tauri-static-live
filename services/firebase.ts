import { auth, db } from '../src/firebaseConfig';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, Timestamp, writeBatch } from 'firebase/firestore';
import { MediaItem } from '../types';
import { saveMediaItem, getAllMediaItems } from './storage';

let currentUser: User | null = null;

export const initAuth = () => {
    return new Promise<User | null>((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('Firebase: Signed in anonymously', user.uid);
                currentUser = user;
                resolve(user);
            } else {
                // DEBUGGING BLOCK
                console.log("Attempting to sign in...");
                signInAnonymously(auth)
                    .then((userCredential) => {
                        console.log("✅ SUCCESS! Signed in as:", userCredential.user.uid);
                        currentUser = userCredential.user;
                        resolve(userCredential.user);
                    })
                    .catch((error) => {
                        console.error("🔥 FIREBASE AUTH ERROR:", error.code, error.message);
                        resolve(null);
                    });
            }
        });
    });
};

export const syncItemUp = async (item: MediaItem) => {
    if (!currentUser) return;

    try {
        // Read markers from LocalStorage
        const localMarkersStr = localStorage.getItem(`markers_${item.key}`);
        const markers = localMarkersStr ? JSON.parse(localMarkersStr) : {};

        const ref = doc(db, `users/${currentUser.uid}/media_data/${item.key}`);
        await setDoc(ref, {
            key: item.key,
            progress: item.resumeTime || 0,
            markers: markers,
            lastUpdated: Timestamp.now(),
            lastPlayed: item.lastPlayed || Date.now()
        }, { merge: true });
        console.log('Firebase: Synced item up (with markers)', item.key);
    } catch (e) {
        console.error('Firebase: Sync up failed', e);
    }
};

export const syncLibraryDown = async () => {
    if (!currentUser) return;

    try {
        console.log('Firebase: Syncing down...');
        const localItems = await getAllMediaItems();
        const remoteSnapshot = await getDocs(collection(db, `users/${currentUser.uid}/media_data`));

        let changesCount = 0;

        for (const doc of remoteSnapshot.docs) {
            const data = doc.data();
            const localItem = localItems.find(i => i.key === data.key);

            // If remote is newer OR local doesn't have lastPlayed (fresh import)
            if (localItem && ((data.lastPlayed || 0) > (localItem.lastPlayed || 0))) {
                // Remote is newer
                const updatedItem = {
                    ...localItem,
                    resumeTime: data.progress,
                    lastPlayed: data.lastPlayed
                };
                await saveMediaItem(updatedItem);

                // Sync Markers Down
                if (data.markers) {
                    localStorage.setItem(`markers_${data.key}`, JSON.stringify(data.markers));
                }

                changesCount++;
            }
        }

        if (changesCount > 0) {
            console.log(`Firebase: Updated ${changesCount} items from cloud.`);
            return true; // value indicating changes happened
        }
    } catch (e) {
        console.error('Firebase: Sync down failed', e);
    }
    return false;
};
// Manual Sync All Items
export const syncAllUp = async () => {
    let user = currentUser;
    if (!user) {
        user = await initAuth();
    }
    if (!user) throw new Error("Authentication failed");

    const localItems = await getAllMediaItems();
    console.log(`Firebase: Starting manual sync for ${localItems.length} items...`);

    let successCount = 0;
    for (const item of localItems) {
        await syncItemUp(item);
        successCount++;
    }
    return successCount;
};
