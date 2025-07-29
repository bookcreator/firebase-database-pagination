const { assert } = require('chai')
const sinon = require('sinon')
const paginate = require('../')

/**
 * @typedef {import('firebase-admin').database.DataSnapshot} DataSnapshot
 */

describe('.key', function () {

   const initialData = {
      noChildren: {
      },
      singleChild: {
         'REF': 'hello'
      },
      manyChildren: {},
      limitChildren: {
         REF_7: 0,
         REF_1: 0,
         REF_3: 0,
         REF_2: 0,
         REF_8: 0,
         REF_4: 0,
         REF_6: 0,
         REF_5: 0
      }
   }

   const manyChildrenCount = 40

   // Create in random order
   let i = 0
   while (Object.keys(initialData.manyChildren).length < manyChildrenCount) {
      initialData.manyChildren[`REF_${(Math.random() * manyChildrenCount * 100).toFixed(0)}`] = `hello-${i++}`
   }
   const manyChildrenKeyOrder = Object.keys(initialData.manyChildren).sort((k1, k2) => k1.localeCompare(k2))

   /** @type {import('firebase-admin/database').Database} */
   let database

   before(async function () {
      database = require('firebase-admin/database').getDatabase()

      await database.ref().set(initialData)
   })

   this.slow(1000)
   this.timeout(3000)

   it('should have no results for no children', async function () {
      const results = await paginate.key(database.ref('noChildren'), 10)
      assert.deepStrictEqual(results, [])
   })

   it('should single DataSnapshot for 1 childen', async function () {
      /** @type {DataSnapshot[]} */
      const results = await paginate.key(database.ref('singleChild'), 10)
      assert.lengthOf(results, 1)
      // Check it's a DataSnapshot
      assert.property(results[0], 'key')
      assert.property(results[0], 'ref')
      // Check it's correct child
      assert.deepStrictEqual(results[0].key, 'REF')
      assert.deepStrictEqual(results[0].val(), 'hello')
   })

   it('should return all children when paging over a greater child count', async function () {
      /** @type {DataSnapshot[]} */
      const results = await paginate.key(database.ref('manyChildren'), Object.keys(initialData.manyChildren).length + 10)
      assert.lengthOf(results, manyChildrenCount)
      assert.sameOrderedMembers(results.map(d => d.key), manyChildrenKeyOrder)
   })

   it('should return all children when paging over child count + 1', async function () {
      /** @type {DataSnapshot[]} */
      const results = await paginate.key(database.ref('manyChildren'), Object.keys(initialData.manyChildren).length + 1)
      assert.lengthOf(results, manyChildrenCount)
      assert.sameOrderedMembers(results.map(d => d.key), manyChildrenKeyOrder)
   })

   it('should return all children when paging over child count + 2', async function () {
      /** @type {DataSnapshot[]} */
      const results = await paginate.key(database.ref('manyChildren'), Object.keys(initialData.manyChildren).length + 2)
      assert.lengthOf(results, manyChildrenCount)
      assert.sameOrderedMembers(results.map(d => d.key), manyChildrenKeyOrder)
   })

   it('should return all children when paging over exact child count', async function () {
      /** @type {DataSnapshot[]} */
      const results = await paginate.key(database.ref('manyChildren'), Object.keys(initialData.manyChildren).length)
      assert.lengthOf(results, manyChildrenCount)
      assert.sameOrderedMembers(results.map(d => d.key), manyChildrenKeyOrder)
   })

   it('should return all children when paging over child count - 1', async function () {
      /** @type {DataSnapshot[]} */
      const results = await paginate.key(database.ref('manyChildren'), Object.keys(initialData.manyChildren).length - 1)
      assert.lengthOf(results, manyChildrenCount)
      assert.sameOrderedMembers(results.map(d => d.key), manyChildrenKeyOrder)
   })

   it('should return all children when paging over child count - 2', async function () {
      /** @type {DataSnapshot[]} */
      const results = await paginate.key(database.ref('manyChildren'), Object.keys(initialData.manyChildren).length - 1)
      assert.lengthOf(results, manyChildrenCount)
      assert.sameOrderedMembers(results.map(d => d.key), manyChildrenKeyOrder)
   })

   it('should return all children when paging over less than child count', async function () {
      /** @type {DataSnapshot[]} */
      const results = await paginate.key(database.ref('manyChildren'), Object.keys(initialData.manyChildren).length - 10)
      assert.lengthOf(results, manyChildrenCount)
      assert.sameOrderedMembers(results.map(d => d.key), manyChildrenKeyOrder)
   })

   describe('limits', function () {

      it('should return exact values using equalTo', async function () {
         const results = await paginate.key(database.ref('limitChildren'), 5, { equalTo: 'REF_5' })
         assert.lengthOf(results, 1)
         assert.sameOrderedMembers(results.map(d => d.key), ['REF_5'])
      })

      it('should return no values using equalTo that matches nothing', async function () {
         const results = await paginate.key(database.ref('limitChildren'), 5, { equalTo: 'REF_X' })
         assert.deepStrictEqual(results, [])
      })

      it('should return no values if limits out of bounds using endAt', async function () {
         const results = await paginate.key(database.ref('limitChildren'), 5, { endAt: 'REF_0' })
         assert.deepStrictEqual(results, [])
      })

      it('should return no values if limits out of bounds using startAt', async function () {
         const results = await paginate.key(database.ref('limitChildren'), 5, { startAt: 'REF_9' })
         assert.deepStrictEqual(results, [])
      })

      it('should return no values if limits out of bounds using startAt and endAt', async function () {
         const results = await paginate.key(database.ref('limitChildren'), 5, { startAt: 'REF_9', endAt: 'REF_A' })
         assert.deepStrictEqual(results, [])
      })

      it('should return prefix values when using endAt limit', async function () {
         const results = await paginate.key(database.ref('limitChildren'), 5, { endAt: 'REF_4' })
         assert.lengthOf(results, 4)
         assert.sameOrderedMembers(results.map(d => d.key), ['REF_1', 'REF_2', 'REF_3', 'REF_4'])
      })

      it('should return suffix values when using startAt limit', async function () {
         const results = await paginate.key(database.ref('limitChildren'), 3, { startAt: 'REF_4' })
         assert.lengthOf(results, 5)
         assert.sameOrderedMembers(results.map(d => d.key), ['REF_4', 'REF_5', 'REF_6', 'REF_7', 'REF_8'])
      })

      it('should return interval values when using startAt and endAt limit', async function () {
         const results = await paginate.key(database.ref('limitChildren'), 3, { startAt: 'REF_4', endAt: 'REF_7' })
         assert.lengthOf(results, 4)
         assert.sameOrderedMembers(results.map(d => d.key), ['REF_4', 'REF_5', 'REF_6', 'REF_7'])
      })

      it('should return single value when using same startAt and endAt limit', async function () {
         const results = await paginate.key(database.ref('limitChildren'), 3, { startAt: 'REF_5', endAt: 'REF_5' })
         assert.lengthOf(results, 1)
         assert.sameOrderedMembers(results.map(d => d.key), ['REF_5'])
      })

      it('should return no values when using same startAt and endAt limit that match nothing', async function () {
         const results = await paginate.key(database.ref('limitChildren'), 3, { startAt: 'REF_X', endAt: 'REF_X' })
         assert.deepStrictEqual(results, [])
      })
   })

   describe('.transformed', function () {
      this.slow(800)

      /** @type {((snapshot: DataSnapshot) => Promise<string>) & sinon.SinonStub<any[], Promise<string>>} */
      const transformStub = sinon.stub().callsFake(async d => d.key)

      beforeEach(function () {
         transformStub.resetHistory()
      })

      it('should never call transformer when paginate has no children', async function () {
         const results = await paginate.key.transformed(database.ref('noChildren'), 10, transformStub)
         assert.deepStrictEqual(results, [])
         sinon.assert.notCalled(transformStub)
      })

      it('should call transformer once when paginate has a single child', async function () {
         const results = await paginate.key.transformed(database.ref('singleChild'), 10, transformStub)
         assert.sameDeepMembers(results, Object.keys(initialData.singleChild))
         sinon.assert.calledOnce(transformStub)
      })

      it('should call transformer that returns plain value', async function () {
         /** @type {((snapshot: DataSnapshot) => boolean) & sinon.SinonStub<any[], boolean>} */
         const plainStub = sinon.stub().callsFake(_d => false)
         const results = await paginate.key.transformed(database.ref('singleChild'), 10, plainStub)
         assert.sameDeepMembers(results, [false])
         sinon.assert.calledOnce(plainStub)
      })

      it('should call transformer the same number of times as children when paginate has a many children', async function () {
         this.slow(1200)

         const results = await paginate.key.transformed(database.ref('manyChildren'), 10, transformStub)
         assert.sameDeepMembers(results, Object.keys(initialData.manyChildren))
         sinon.assert.callCount(transformStub, Object.keys(initialData.manyChildren).length)
      })

      it('should call transformer in same correct order', async function () {
         const results = await paginate.key.transformed(database.ref('manyChildren'), Object.keys(initialData.manyChildren).length, transformStub)
         assert.sameOrderedMembers(results, manyChildrenKeyOrder)
         sinon.assert.callCount(transformStub, manyChildrenKeyOrder.length)
         manyChildrenKeyOrder.forEach((k, idx) => {
            sinon.assert.calledWithMatch(transformStub.getCall(idx), sinon.match.has('key', k))
         })
      })

      describe('limits', function () {

         it('should return exact values using equalTo', async function () {
            const results = await paginate.key.transformed(database.ref('limitChildren'), 5, transformStub, { equalTo: 'REF_5' })
            assert.lengthOf(results, 1)
            assert.sameOrderedMembers(results, ['REF_5'])
            sinon.assert.calledOnce(transformStub)
         })

         it('should return no values using equalTo that matches nothing', async function () {
            const results = await paginate.key.transformed(database.ref('limitChildren'), 5, transformStub, { equalTo: 'REF_X' })
            assert.deepStrictEqual(results, [])
            sinon.assert.notCalled(transformStub)
         })

         it('should return no values if limits out of bounds using endAt', async function () {
            const results = await paginate.key.transformed(database.ref('limitChildren'), 5, transformStub, { endAt: 'REF_0' })
            assert.deepStrictEqual(results, [])
            sinon.assert.notCalled(transformStub)
         })

         it('should return no values if limits out of bounds using startAt', async function () {
            const results = await paginate.key.transformed(database.ref('limitChildren'), 5, transformStub, { startAt: 'REF_9' })
            assert.deepStrictEqual(results, [])
            sinon.assert.notCalled(transformStub)
         })

         it('should return no values if limits out of bounds using startAt and endAt', async function () {
            const results = await paginate.key.transformed(database.ref('limitChildren'), 5, transformStub, { startAt: 'REF_9', endAt: 'REF_A' })
            assert.deepStrictEqual(results, [])
            sinon.assert.notCalled(transformStub)
         })

         it('should return prefix values when using endAt limit', async function () {
            const results = await paginate.key.transformed(database.ref('limitChildren'), 5, transformStub, { endAt: 'REF_4' })
            assert.sameOrderedMembers(results, ['REF_1', 'REF_2', 'REF_3', 'REF_4'])
            sinon.assert.callCount(transformStub, 4)
         })

         it('should return suffix values when using startAt limit', async function () {
            const results = await paginate.key.transformed(database.ref('limitChildren'), 3, transformStub, { startAt: 'REF_4' })
            assert.sameOrderedMembers(results, ['REF_4', 'REF_5', 'REF_6', 'REF_7', 'REF_8'])
            sinon.assert.callCount(transformStub, 5)
         })

         it('should return interval values when using startAt and endAt limit', async function () {
            const results = await paginate.key.transformed(database.ref('limitChildren'), 3, transformStub, { startAt: 'REF_4', endAt: 'REF_7' })
            assert.sameOrderedMembers(results, ['REF_4', 'REF_5', 'REF_6', 'REF_7'])
            sinon.assert.callCount(transformStub, 4)
         })

         it('should return single value when using same startAt and endAt limit', async function () {
            const results = await paginate.key.transformed(database.ref('limitChildren'), 3, transformStub, { startAt: 'REF_5', endAt: 'REF_5' })
            assert.sameOrderedMembers(results, ['REF_5'])
            sinon.assert.calledOnce(transformStub)
         })

         it('should return no values when using same startAt and endAt limit that match nothing', async function () {
            const results = await paginate.key.transformed(database.ref('limitChildren'), 3, transformStub, { startAt: 'REF_X', endAt: 'REF_X' })
            assert.deepStrictEqual(results, [])
            sinon.assert.notCalled(transformStub)
         })
      })
   })
})
