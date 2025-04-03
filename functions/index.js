const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Function to join a room
exports.joinRoomFunction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { roomId, userId } = data;
  const usersRef = admin.database().ref(`rooms/${roomId}/users`);
  const usersSnapshot = await usersRef.once('value');
  const users = usersSnapshot.val() ? Object.keys(usersSnapshot.val()) : [];

  if (users.length >= 4 && !users.includes(userId)) {
    throw new functions.https.HttpsError('resource-exhausted', 'Room is at maximum capacity.');
  }

  await admin.database().ref(`rooms/${roomId}/users/${userId}`).set(true);

  const creatorSnapshot = await admin.database().ref(`rooms/${roomId}/creatorId`).once('value');
  const isCreator = !creatorSnapshot.exists();

  if (isCreator) {
    await admin.database().ref(`rooms/${roomId}/creatorId`).set(userId);
  }

  return { isCreator };
});

// Function to update platform choices
exports.updatePlatformChoice = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { roomId, platformNumber, userId, choice } = data;
  await admin.database().ref(`rooms/${roomId}/platforms/${platformNumber}/${userId}`).set(choice);
});

// Function to clear room
exports.clearRoomFunction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }
  const { roomId } = data;
  await admin.database().ref(`rooms/${roomId}/platforms`).set(null);
});

// Function to close room
exports.closeRoomFunction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }
  const { roomId, isCreator } = data;
  if (!isCreator){
    throw new functions.https.HttpsError('permission-denied', 'You are not the creator of this room.');
  }
  await admin.database().ref(`rooms/${roomId}`).remove();
});
