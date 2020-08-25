/* eslint-disable mocha/no-hooks-for-single-case */
/* eslint-disable node/global-require */

/** @type {string} */
let originalRules
before(async function getOldIndexesAndCleanupDB() {
   this.timeout(50000)
   const database = require('firebase-admin').database()
   originalRules = await database.getRules()
   await database.ref().remove()
})

after(async function restoreIndexesAndCleanupDB() {
   this.timeout(5000)
   const admin = require('firebase-admin')
   const database = admin.database()
   await database.setRules(originalRules)
   await database.ref().remove()
   await Promise.all(admin.apps.map(a => a.delete()))
})
