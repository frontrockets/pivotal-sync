const firebase = require('firebase-admin')

const creds = require('../../.firebase-creds.json')

if (!firebase.apps.length) {
  firebase.initializeApp({
    credential: firebase.credential.cert(creds),
    databaseURL: 'https://pivotal-sync-queue.firebaseio.com',
  })
}

const db = firebase.firestore()

module.exports = async function queue({ maxTime, storyId }, action) {
  const ref = db.doc(`queue/${storyId}`)
  const docInQueue = await ref.get()

  const notInQueue = !docInQueue.exists
  const previousReqIsSlow =
    docInQueue.exists &&
    Date.now() - docInQueue.data().created_at.toMillis() > maxTime

  if (notInQueue || previousReqIsSlow) {
    await ref.set({ created_at: firebase.firestore.Timestamp.now() })

    let errorInAction
    try {
      await action()
    } catch (error) {
      errorInAction = error
    }

    await ref.delete()

    if (errorInAction) {
      throw Error(errorInAction)
    }
  }
}
