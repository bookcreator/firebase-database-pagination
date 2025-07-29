 

exports.mochaGlobalSetup = () => {
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
}

exports.mochaGlobalTeardown = async () => {
   const firebase = require('firebase-admin/app')
   await Promise.all(firebase.getApps().map(a => firebase.deleteApp(a)))
}

/** @type {string} */
let originalRules

exports.mochaHooks = {
   async beforeAll() {
      this.timeout(50000)
      const database = require('firebase-admin/database').getDatabase()
      originalRules = await database.getRules()
      await database.ref().remove()
   },
   async beforeEach() {
   },
   async afterAll() {
      this.timeout(5000)
      const database = require('firebase-admin/database').getDatabase()
      await database.setRules(originalRules)
      await database.ref().remove()
   },
   async afterEach() {
   },
}
