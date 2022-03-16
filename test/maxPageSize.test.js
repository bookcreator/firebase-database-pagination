const assert = require('assert').strict
const sinon = require('sinon')
const database = require('firebase-admin/database').getDatabase()
const paginate = require('../')

const CHILD_KEY = 'bob'
const BAD_KEY = '__blah'

// eslint-disable-next-line node/global-require
const SRC_REGEX = new RegExp(`${require('path').resolve(__dirname, '..')}/index\\.js`)

describe('maxPageSize parameter', function () {

   const maxPageSizeTests = {
      key: () => [database.ref(BAD_KEY)],
      value: () => [database.ref(BAD_KEY)],
      child: () => [database.ref(BAD_KEY), CHILD_KEY],
   }

   for (const fnName in maxPageSizeTests) {

      /** @typedef {import('../').CursorLimits} CursorLimits */
      const fn = Object.assign(
         /**
          * @param {number} maxPageSize
          * @param {CursorLimits} [limits]
          * @returns {Promise<DataSnapshot[]>}
          */
         (maxPageSize, limits) => paginate[fnName](...maxPageSizeTests[fnName](), maxPageSize, limits),
         {
            /**
             * @template T
             * @param {number} maxPageSize
             * @param {import('../').Transformer<T>} transformer
             * @param {CursorLimits} [limits]
             * @returns {Promise<T[]>}
             */
            transformed: (maxPageSize, transformer, limits) => paginate[fnName].transformed(...maxPageSizeTests[fnName](), maxPageSize, transformer, limits)
         }
      )

      before(async function setIndexes() {
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
               if (typeof assert.doesNotMatch === 'function') {
                  assert.doesNotMatch(err.stack, SRC_REGEX)
               } else {
                  // assert.doesNotMatch introduced v12.16.0
                  if (SRC_REGEX.test(err.stack)) {
                     assert.fail(new assert.AssertionError({
                        // eslint-disable-next-line node/global-require
                        message: `The input was expected to not match the regular expression ${SRC_REGEX}. Input:\n\n${require('util').format(err.stack)}\n`,
                        actual: err.stack,
                        expected: SRC_REGEX,
                        operator: 'doesNotMatch',
                        stackStartFn: assert.AssertionError,
                     }))
                  }
               }
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
