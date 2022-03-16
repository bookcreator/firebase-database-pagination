/* eslint-disable mocha/no-hooks-for-single-case */
/* eslint-disable node/global-require */

/** @type {string} */
let originalRules
before(async function getOldIndexesAndCleanupDB() {
   this.timeout(50000)
   const database = require('firebase-admin/database').getDatabase()
   originalRules = await database.getRules()
   await database.ref().remove()
})

after(async function restoreIndexesAndCleanupDB() {
   this.timeout(5000)
   const database = require('firebase-admin/database').getDatabase()
   await database.setRules(originalRules)
   await database.ref().remove()
   const firebase = require('firebase-admin/app')
   await Promise.all(firebase.getApps().map(a => firebase.deleteApp(a)))
})
