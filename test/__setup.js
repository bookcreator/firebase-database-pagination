const admin = require('firebase-admin')

const EMULATED = 'against-emulator'

let databaseURL = 'http'
let credential = admin.credential.applicationDefault()
if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
   // Use emulator directly so rules access etc. function
   databaseURL += `://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=${encodeURIComponent(EMULATED)}`
   if (process.env.GITHUB_ACTIONS) {
      // Don't have any ADC on Github so just provide a dummy token - we're using the emulator anyway
      credential = {
         async getAccessToken() {
            return { access_token: 'blah', expires_in: 1000000 }
         }
      }
   }
} else {
   databaseURL += `s://${process.env.FIREBASE_DB_NAME || EMULATED}.firebaseio.com`
}

admin.initializeApp({ credential, databaseURL })
