const assert = require('assert').strict
const sinon = require('sinon')
const paginate = require('../')

/**
 * @typedef {import('firebase-admin/database').IteratedDataSnapshot} IteratedDataSnapshot
 */

const CHILD_KEY = 'bob'
const BAD_KEY = '__blah'

const SRC_REGEX = new RegExp(`${require('path').resolve(__dirname, '..')}/index\\.js`)

describe('maxPageSize parameter', function () {

   /** @type {{ [name: string]: (db: import('@firebase/database').Database) => [ref: import('@firebase/database').DatabaseReference] }} */
   const maxPageSizeTests = {
      key: db => [db.ref(BAD_KEY)],
      value: db => [db.ref(BAD_KEY)],
      child: db => [db.ref(BAD_KEY), CHILD_KEY],
   }

   for (const fnName in maxPageSizeTests) {
      const getRef = maxPageSizeTests[fnName]

      /** @typedef {import('../').CursorLimits} CursorLimits */
      const fn = Object.assign(
         /**
          * @param {number} maxPageSize
          * @param {CursorLimits} [limits]
          * @returns {Promise<IteratedDataSnapshot[]>}
          */
         (maxPageSize, limits) => paginate[fnName](...getRef(database), maxPageSize, limits),
         {
            /**
             * @template T
             * @param {number} maxPageSize
             * @param {import('../').Transformer<T>} transformer
             * @param {CursorLimits} [limits]
             * @returns {Promise<T[]>}
             */
            transformed: (maxPageSize, transformer, limits) => paginate[fnName].transformed(...getRef(database), maxPageSize, transformer, limits)
         }
      )

      /** @type {import('firebase-admin/database').Database} */
      let database

      before(async function setIndexes() {
         database = require('firebase-admin/database').getDatabase()

         this.timeout(5000)

         await database.setRules({
            rules: {
               [BAD_KEY]: {
                  '.indexOn': ['.value', CHILD_KEY]
               }
            }
         })
      })

      describe(`.${fnName}`, function () {

         /** @type {sinon.SinonStub<Parameters<process['emitWarning']>, ReturnType<process['emitWarning']>>} */
         let emitWarningStub

         before(function () {
            emitWarningStub = sinon.stub(process, 'emitWarning')
         })

         beforeEach(function () {
            emitWarningStub.resetHistory()
         })

         after(function () {
            emitWarningStub.restore()
         })

         this.slow(100)

         it('should throw error for non-number values', async function () {
            // @ts-ignore
            await assert.rejects(fn(false), RangeError)
            sinon.assert.notCalled(emitWarningStub)
         })

         it('should throw error for invalid number values', async function () {
            await assert.rejects(fn(-1), RangeError)
            await assert.rejects(fn(0), RangeError)
            await assert.rejects(fn(1), RangeError)
            sinon.assert.notCalled(emitWarningStub)
         })

         it('should emit process warning single page sizes', async function () {
            this.slow(250)
            await fn(2)
            sinon.assert.calledOnce(emitWarningStub)
            sinon.assert.calledWith(emitWarningStub, sinon.match(/maxPageSize of \d+ is inefficient/i), undefined, sinon.match.func)
         })

         it('should have tidy stack traces for RangeError', async function () {
            await assert.rejects(fn(-1), err => {
               assert.doesNotMatch(err.stack, SRC_REGEX)
               return true
            })
         })

         describe('.transformed', function () {
            this.slow(250)

            it('should emit process warning single page sizes', async function () {
               await fn.transformed(2, _a => false)
               sinon.assert.calledOnce(emitWarningStub)
               sinon.assert.calledWith(emitWarningStub, sinon.match(/maxPageSize of \d+ is inefficient/i), undefined, sinon.match.func)
            })
         })
      })
   }
})
