const { assert } = require('chai')
const sinon = require('sinon')
const paginate = require('../')

/**
 * @typedef {import('firebase-admin/database').IteratedDataSnapshot} IteratedDataSnapshot
 */

const BAD_KEY = '__blah'

const CHILD_KEY = 'bob'

describe('.child', function () {

   const index = {
      '.indexOn': CHILD_KEY
   }

   const initialData = {
      noValues: {
      },
      singleValue: {
         'REF': {
            [CHILD_KEY]: 0
         }
      },
      manyValues: {},
      sameValues: {
         REF1: {
            [CHILD_KEY]: 10
         },
         REF2: {
            [CHILD_KEY]: 5
         },
         REF3: {
            [CHILD_KEY]: 100
         },
         REF4: {
            [CHILD_KEY]: -2
         },
         REF5: {
            [CHILD_KEY]: 200
         },
         REF6: {
            [CHILD_KEY]: 10
         },
         REF7: {
            [CHILD_KEY]: 10
         }
      }
   }
   const sameValueKeyOrder = Object.keys(initialData.sameValues).sort((k1, k2) => {
      const d = initialData.sameValues[k1][CHILD_KEY] - initialData.sameValues[k2][CHILD_KEY]
      return d === 0 ? k1.localeCompare(k2) : d
   })

   const manyValuesCount = 400

   for (let i = 0; i < manyValuesCount; i++) {
      initialData.manyValues[`REF_${i}`] = {
         [CHILD_KEY]: i
      }
   }

   /** @type {import('firebase-admin/database').Database} */
   let database

   before(async function setIndexesAndData() {
      database = require('firebase-admin/database').getDatabase()

      this.timeout(5000)

      const rules = { [BAD_KEY]: index }
      for (const k in initialData) {
         rules[k] = index
      }

      await database.setRules({ rules })

      await database.ref().set(initialData)
   })

   this.slow(5000)
   this.timeout(8000)

   it('should have no results for no children', async function () {
      const results = await paginate.child(database.ref('noValues'), CHILD_KEY, 10)
      assert.deepStrictEqual(results, [])
   })

   it('should single DataSnapshot for 1 child', async function () {
      const results = await paginate.child(database.ref('singleValue'), CHILD_KEY, 10)
      assert.lengthOf(results, 1)
      // Check it's a DataSnapshot
      assert.property(results[0], 'key')
      assert.property(results[0], 'ref')
      // Check it's correct child
      assert.deepStrictEqual(results[0].key, 'REF')
   })

   it('should return all values when paging over a greater child count', async function () {
      const results = await paginate.child(database.ref('manyValues'), CHILD_KEY, Object.keys(initialData.manyValues).length + 10)
      assert.lengthOf(results, manyValuesCount)
      assert.sameMembers(results.map(d => d.key), Object.keys(initialData.manyValues))
   })

   it('should return all values when paging over child count + 1', async function () {
      const results = await paginate.child(database.ref('manyValues'), CHILD_KEY, Object.keys(initialData.manyValues).length + 1)
      assert.lengthOf(results, manyValuesCount)
      assert.sameMembers(results.map(d => d.key), Object.keys(initialData.manyValues))
   })

   it('should return all values when paging over child count + 2', async function () {
      const results = await paginate.child(database.ref('manyValues'), CHILD_KEY, Object.keys(initialData.manyValues).length + 2)
      assert.lengthOf(results, manyValuesCount)
      assert.sameMembers(results.map(d => d.key), Object.keys(initialData.manyValues))
   })

   it('should return all values when paging over exact child count', async function () {
      const results = await paginate.child(database.ref('manyValues'), CHILD_KEY, Object.keys(initialData.manyValues).length)
      assert.lengthOf(results, manyValuesCount)
      assert.sameMembers(results.map(d => d.key), Object.keys(initialData.manyValues))
   })

   it('should return all values when paging over child count - 1', async function () {
      const results = await paginate.child(database.ref('manyValues'), CHILD_KEY, Object.keys(initialData.manyValues).length - 1)
      assert.lengthOf(results, manyValuesCount)
      assert.sameMembers(results.map(d => d.key), Object.keys(initialData.manyValues))
   })

   it('should return all values when paging over child count - 2', async function () {
      const results = await paginate.child(database.ref('manyValues'), CHILD_KEY, Object.keys(initialData.manyValues).length - 1)
      assert.lengthOf(results, manyValuesCount)
      assert.sameMembers(results.map(d => d.key), Object.keys(initialData.manyValues))
   })

   it('should return all values when paging over less than child count', async function () {
      const results = await paginate.child(database.ref('manyValues'), CHILD_KEY, Object.keys(initialData.manyValues).length - 10)
      assert.lengthOf(results, manyValuesCount)
      assert.sameMembers(results.map(d => d.key), Object.keys(initialData.manyValues))
   })

   it('should return all values in order', async function () {
      const results = await paginate.child(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length)
      assert.lengthOf(results, Object.keys(initialData.sameValues).length)
      assert.sameOrderedMembers(results.map(d => d.key), sameValueKeyOrder)
   })

   describe('limits', function () {

      it('should return exact values using equalTo', async function () {
         const results = await paginate.child(database.ref('sameValues'), CHILD_KEY, 5, { equalTo: 10 })
         assert.lengthOf(results, 3)
         assert.sameOrderedMembers(results.map(d => d.key), ['REF1', 'REF6', 'REF7'])
      })

      it('should return no values using equalTo that matches nothing', async function () {
         const results = await paginate.child(database.ref('sameValues'), CHILD_KEY, 5, { equalTo: 123456789 })
         assert.deepStrictEqual(results, [])
      })

      it('should return prefix values when using endAt limit', async function () {
         const results = await paginate.child(database.ref('manyValues'), CHILD_KEY, 5, { endAt: 10 })
         assert.lengthOf(results, 11)
         assert.sameOrderedMembers(results.map(d => d.key), ['REF_0', 'REF_1', 'REF_2', 'REF_3', 'REF_4', 'REF_5', 'REF_6', 'REF_7', 'REF_8', 'REF_9', 'REF_10'])
      })

      it('should return suffix values when using startAt limit', async function () {
         const results = await paginate.child(database.ref('manyValues'), CHILD_KEY, 5, { startAt: 390 })
         assert.lengthOf(results, 10)
         assert.sameOrderedMembers(results.map(d => d.key), ['REF_390', 'REF_391', 'REF_392', 'REF_393', 'REF_394', 'REF_395', 'REF_396', 'REF_397', 'REF_398', 'REF_399'])
      })

      it('should return interval values when using startAt and endAt limit', async function () {
         const results = await paginate.child(database.ref('manyValues'), CHILD_KEY, 5, { startAt: 10, endAt: 20 })
         assert.lengthOf(results, 11)
         assert.sameOrderedMembers(results.map(d => d.key), ['REF_10', 'REF_11', 'REF_12', 'REF_13', 'REF_14', 'REF_15', 'REF_16', 'REF_17', 'REF_18', 'REF_19', 'REF_20'])
      })

      it('should return no values if limits out of bounds using endAt', async function () {
         const results = await paginate.child(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, { endAt: -3 })
         assert.deepStrictEqual(results, [])
      })

      it('should return no values if limits out of bounds using startAt', async function () {
         const results = await paginate.child(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, { startAt: 201 })
         assert.deepStrictEqual(results, [])
      })

      it('should return no values if limits out of bounds using startAt and endAt', async function () {
         const results = await paginate.child(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, { startAt: 201, endAt: 201 })
         assert.deepStrictEqual(results, [])
      })

      it('should return subset of values in order using endAt', async function () {
         const results = await paginate.child(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, { endAt: 10 })
         assert.sameOrderedMembers(results.map(d => d.key), ['REF4', 'REF2', 'REF1', 'REF6', 'REF7'])
      })

      it('should return subset of values in order using startAt', async function () {
         const results = await paginate.child(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, { startAt: 10 })
         assert.sameOrderedMembers(results.map(d => d.key), ['REF1', 'REF6', 'REF7', 'REF3', 'REF5'])
      })

      it('should return subset of values in order using startAt and endAt', async function () {
         const results = await paginate.child(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, { startAt: 10, endAt: 100 })
         assert.sameOrderedMembers(results.map(d => d.key), ['REF1', 'REF6', 'REF7', 'REF3'])
      })

      it('should return subset of values in order using same startAt and endAt', async function () {
         const results = await paginate.child(database.ref('sameValues'), CHILD_KEY, 3, { startAt: 10, endAt: 10 })
         assert.sameOrderedMembers(results.map(d => d.key), ['REF1', 'REF6', 'REF7'])
      })

      it('should return no values using same startAt and endAt that match nothing', async function () {
         const results = await paginate.child(database.ref('sameValues'), CHILD_KEY, 3, { startAt: 123456789, endAt: 123456789 })
         assert.deepStrictEqual(results, [])
      })
   })

   describe('.transformed', function () {
      this.slow(8000)

      /** @type {((snapshot: IteratedDataSnapshot) => Promise<string>) & sinon.SinonStub<any[], Promise<string>>} */
      const transformStub = sinon.stub().callsFake(async d => d.key)

      beforeEach(function () {
         transformStub.resetHistory()
      })

      it('should never call transformer when paginate has no children', async function () {
         const results = await paginate.child.transformed(database.ref('noValues'), CHILD_KEY, 10, transformStub)
         assert.deepStrictEqual(results, [])
         sinon.assert.notCalled(transformStub)
      })

      it('should call transformer once when paginate has a single child', async function () {
         const results = await paginate.child.transformed(database.ref('singleValue'), CHILD_KEY, 10, transformStub)
         assert.sameDeepMembers(results, Object.keys(initialData.singleValue))
         sinon.assert.calledOnce(transformStub)
      })

      it('should call transformer that returns plain value', async function () {
         /** @type {((snapshot: IteratedDataSnapshot) => boolean) & sinon.SinonStub<any[], boolean>} */
         const plainStub = sinon.stub().callsFake(_d => false)
         const results = await paginate.child.transformed(database.ref('singleValue'), CHILD_KEY, 10, plainStub)
         assert.sameDeepMembers(results, [false])
         sinon.assert.calledOnce(plainStub)
      })

      it('should call transformer the same number of times as values when paginate has a many children', async function () {
         this.slow(10000)
         this.timeout(15000)

         const results = await paginate.child.transformed(database.ref('manyValues'), CHILD_KEY, 10, transformStub)
         assert.sameDeepMembers(results, Object.keys(initialData.manyValues))
         sinon.assert.callCount(transformStub, Object.keys(initialData.manyValues).length)
      })

      it('should call transformer in same order as values', async function () {
         const results = await paginate.child.transformed(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, transformStub)
         assert.sameOrderedMembers(results, sameValueKeyOrder)
         sinon.assert.callCount(transformStub, Object.keys(initialData.sameValues).length)
         sameValueKeyOrder.forEach((k, idx) => {
            sinon.assert.calledWithMatch(transformStub.getCall(idx), sinon.match.has('key', k))
         })
      })

      describe('limits', function () {

         it('should return exact values using equalTo', async function () {
            const results = await paginate.child.transformed(database.ref('sameValues'), CHILD_KEY, 5, transformStub, { equalTo: 10 })
            assert.lengthOf(results, 3)
            assert.sameOrderedMembers(results, ['REF1', 'REF6', 'REF7'])
            sinon.assert.callCount(transformStub, 3)
         })

         it('should return no values using equalTo that matches nothing', async function () {
            const results = await paginate.child.transformed(database.ref('sameValues'), CHILD_KEY, 5, transformStub, { equalTo: 123456789 })
            assert.deepStrictEqual(results, [])
            sinon.assert.notCalled(transformStub)
         })

         it('should return prefix values when using endAt limit', async function () {
            const results = await paginate.child.transformed(database.ref('manyValues'), CHILD_KEY, 5, transformStub, { endAt: 10 })
            assert.sameOrderedMembers(results, ['REF_0', 'REF_1', 'REF_2', 'REF_3', 'REF_4', 'REF_5', 'REF_6', 'REF_7', 'REF_8', 'REF_9', 'REF_10'])
            sinon.assert.callCount(transformStub, 11)
         })

         it('should return suffix values when using startAt limit', async function () {
            const results = await paginate.child.transformed(database.ref('manyValues'), CHILD_KEY, 5, transformStub, { startAt: 390 })
            assert.sameOrderedMembers(results, ['REF_390', 'REF_391', 'REF_392', 'REF_393', 'REF_394', 'REF_395', 'REF_396', 'REF_397', 'REF_398', 'REF_399'])
            sinon.assert.callCount(transformStub, 10)
         })

         it('should return interval values when using startAt and endAt limit', async function () {
            const results = await paginate.child.transformed(database.ref('manyValues'), CHILD_KEY, 5, transformStub, { startAt: 10, endAt: 20 })
            assert.sameOrderedMembers(results, ['REF_10', 'REF_11', 'REF_12', 'REF_13', 'REF_14', 'REF_15', 'REF_16', 'REF_17', 'REF_18', 'REF_19', 'REF_20'])
            sinon.assert.callCount(transformStub, 11)
         })

         it('should return no values if limits out of bounds using endAt', async function () {
            const results = await paginate.child.transformed(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, transformStub, { endAt: -3 })
            assert.deepStrictEqual(results, [])
            sinon.assert.notCalled(transformStub)
         })

         it('should return no values if limits out of bounds using startAt', async function () {
            const results = await paginate.child.transformed(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, transformStub, { startAt: 201 })
            assert.deepStrictEqual(results, [])
            sinon.assert.notCalled(transformStub)
         })

         it('should return no values if limits out of bounds using startAt and endAt', async function () {
            const results = await paginate.child.transformed(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, transformStub, { startAt: 201, endAt: 201 })
            assert.deepStrictEqual(results, [])
            sinon.assert.notCalled(transformStub)
         })

         it('should return subset of values in order using endAt', async function () {
            const results = await paginate.child.transformed(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, transformStub, { endAt: 10 })
            assert.sameOrderedMembers(results, ['REF4', 'REF2', 'REF1', 'REF6', 'REF7'])
            sinon.assert.callCount(transformStub, 5)
         })

         it('should return subset of values in order using startAt', async function () {
            const results = await paginate.child.transformed(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, transformStub, { startAt: 10 })
            assert.sameOrderedMembers(results, ['REF1', 'REF6', 'REF7', 'REF3', 'REF5'])
            sinon.assert.callCount(transformStub, 5)
         })

         it('should return subset of values in order using startAt and endAt', async function () {
            const results = await paginate.child.transformed(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, transformStub, { startAt: 10, endAt: 100 })
            assert.sameOrderedMembers(results, ['REF1', 'REF6', 'REF7', 'REF3'])
            sinon.assert.callCount(transformStub, 4)
         })

         it('should return subset of values in order using same startAt and endAt', async function () {
            const results = await paginate.child.transformed(database.ref('sameValues'), CHILD_KEY, 3, transformStub, { startAt: 10, endAt: 10 })
            assert.sameOrderedMembers(results, ['REF1', 'REF6', 'REF7'])
            sinon.assert.callCount(transformStub, 3)
         })

         it('should return no values using same startAt and endAt that match nothing', async function () {
            const results = await paginate.child.transformed(database.ref('sameValues'), CHILD_KEY, 3, transformStub, { startAt: 123456789, endAt: 123456789 })
            assert.deepStrictEqual(results, [])
            sinon.assert.notCalled(transformStub)
         })
      })
   })

   describe('.forEach', function () {
      this.slow(800)

      /** @type {((snapshot: IteratedDataSnapshot) => Promise<boolean>) & sinon.SinonStub<[snapshot: IteratedDataSnapshot], Promise<boolean>>} */
      const iteratorStub = sinon.stub().callsFake(async d => { })

      beforeEach(function () {
         iteratorStub.resetHistory()
      })

      it('should never call iterator when paginate has no children', async function () {
         const stopped = await paginate.child.forEach(database.ref('noValues'), CHILD_KEY, 10, iteratorStub)
         assert.strictEqual(stopped, false)
         sinon.assert.notCalled(iteratorStub)
      })

      it('should call iterator once when paginate has a single child', async function () {
         const stopped = await paginate.child.forEach(database.ref('singleValue'), CHILD_KEY, 10, iteratorStub)
         assert.strictEqual(stopped, false)
         sinon.assert.calledOnceWithMatch(iteratorStub, sinon.match.has('key', Object.keys(initialData.singleValue)[0]))
      })

      it('should call iterator the same number of times as children when paginate has a many children', async function () {
         this.slow(1200)

         const stopped = await paginate.child.forEach(database.ref('manyValues'), CHILD_KEY, 10, iteratorStub)
         assert.strictEqual(stopped, false)
         sinon.assert.callCount(iteratorStub, Object.keys(initialData.manyValues).length)
      })

      it('should call iterator in same correct order', async function () {
         const stopped = await paginate.child.forEach(database.ref('sameValues'), CHILD_KEY, Object.keys(initialData.sameValues).length, iteratorStub)
         assert.strictEqual(stopped, false)
         sinon.assert.callCount(iteratorStub, sameValueKeyOrder.length)
         sameValueKeyOrder.forEach((k, idx) => {
            sinon.assert.calledWithMatch(iteratorStub.getCall(idx), sinon.match.has('key', k))
         })
      })

      it('should call iterator twice when iteration is stopped after 2 children', async function () {
         /** @type {((snapshot: IteratedDataSnapshot) => Promise<boolean>) & sinon.SinonStub<[snapshot: IteratedDataSnapshot], Promise<boolean>>} */
         const iteratorStub = sinon.stub()
         iteratorStub.onFirstCall().resolves()
         iteratorStub.onSecondCall().resolves(true)

         const stopped = await paginate.child.forEach(database.ref('sameValues'), CHILD_KEY, 10, iteratorStub)
         assert.strictEqual(stopped, true)
         sinon.assert.calledTwice(iteratorStub)
         sameValueKeyOrder.slice(0, 2).forEach((k, idx) => {
            sinon.assert.calledWithMatch(iteratorStub.getCall(idx), sinon.match.has('key', k))
         })
      })
   })
})
