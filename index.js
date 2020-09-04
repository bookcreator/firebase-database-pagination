
/**
 * @typedef {import('firebase-admin').database.DataSnapshot} DataSnapshot
 * @typedef {import('firebase-admin').database.Reference} Reference
 */

/** @template D
 *
 * @callback Transformer<D>
 * @param {DataSnapshot} snapshot Child of provided reference
 * @returns {D | Promise<D>}
 */

/** @typedef {{ startAt?: any, endAt?: any }} CursorLimits */

/**
 * @template T
 *
 * @param {Function} caller
 * @param {import('firebase-admin').database.Query} query
 * @param {(item: DataSnapshot) => any} valueGetter
 * @param {CursorLimits} limits
 * @param {number} maxPageSize
 * @param {Transformer<T>} transformer
 */
const transformPaginatedCursorReference = async (caller, query, valueGetter, limits, maxPageSize, transformer) => {
   if (typeof maxPageSize !== 'number' || maxPageSize <= 1) {
      const err = new RangeError(`maxPageSize must be > 1 (provided ${maxPageSize})`)
      RangeError.captureStackTrace(err, caller)
      throw err
   }
   if (maxPageSize === 2) {
      process.emitWarning(`paginate: maxPageSize of ${maxPageSize} is inefficient and will only result in a single new item on each query`, undefined, caller)
   }

   limits = Object.assign({ startAt: null, endAt: undefined }, limits)

   /** @typedef {{ startingKey: string | null, startAt: any }} Cursor */

   /** @param {Cursor} starting */
   const iterate = async starting => {
      /** @type {Promise<T>[]} */
      const transforms = []
      let cursorQuery = query
      if (valueGetter === orderByKeyGetter) {
         // Order by key
         if (limits.endAt !== undefined && starting.startAt === limits.endAt) {
            // Same as just getting this child
            const child = await cursorQuery.ref.child(limits.endAt).once('value')
            if (!child.exists()) return { results: [], next: null }
            return { results: [await transformer(child)], next: null }
         }
         if (starting.startAt !== null) cursorQuery = cursorQuery.startAt(starting.startAt)
         if (limits.endAt !== undefined) cursorQuery = cursorQuery.endAt(limits.endAt)
      } else {
         // Order by value or child
         if (limits.endAt !== undefined && starting.startAt === limits.endAt) {
            if (starting.startingKey === null) {
               cursorQuery = cursorQuery.equalTo(limits.endAt)
            } else {
               cursorQuery = cursorQuery.equalTo(limits.endAt, starting.startingKey)
            }
         } else {
            if (starting.startingKey === null) {
               cursorQuery = cursorQuery.startAt(starting.startAt)
            } else {
               cursorQuery = cursorQuery.startAt(starting.startAt, starting.startingKey)
            }
            if (limits.endAt !== undefined) cursorQuery = cursorQuery.endAt(limits.endAt)
         }
      }
      const children = await cursorQuery.limitToFirst(maxPageSize).once('value')
      /** @type {?Cursor} */
      let next = null
      children.forEach(d => {
         if (d.key !== starting.startingKey) {
            transforms.push(Promise.resolve(transformer(d)))
            const nextStartAt = valueGetter(d)
            /* istanbul ignore if */
            if (nextStartAt === undefined) throw new Error('valueGetter must non return undefined for a DataSnapshot')
            next = { startingKey: d.key, startAt: nextStartAt }
         }
      })
      const results = await Promise.all(transforms)
      if (children.numChildren() < maxPageSize) {
         // Returned less data than a full page, so no more items
         return { results, next: null }
      } else {
         return { results, next }
      }
   }

   /** @type {Cursor} */
   let previous = { startingKey: null, startAt: limits.startAt }
   /** @type {T[]} */
   const allResults = []
   do {
      const { results, next } = await iterate(previous)
      allResults.push(...results)
      previous = next
   } while (previous !== null)

   return allResults
}

/** @param {DataSnapshot} d */
const orderByKeyGetter = d => d.key

/**
 * @template T
 *
 * @param {Function} caller
 * @param {Reference} reference
 * @param {number} maxPageSize
 * @param {Transformer<T>} transformer
 * @param {CursorLimits} [limits={startAt: null, endAt: undefined}]
 */
const transformPaginatedKeyCursorReference = async (caller, reference, maxPageSize, transformer, limits) => await transformPaginatedCursorReference(caller, reference.orderByKey(), orderByKeyGetter, limits, maxPageSize, transformer)

/**
 * @param {Reference} reference
 * @param {number} maxPageSize
 * @param {CursorLimits} [limits={startAt: null, endAt: undefined}]
 */
module.exports.key = async (reference, maxPageSize, limits) => await transformPaginatedKeyCursorReference(module.exports.key, reference, maxPageSize, d => d, limits)
/**
 * @template T
 *
 * @param {Reference} reference
 * @param {number} maxPageSize
 * @param {Transformer<T>} transformer
 * @param {CursorLimits} [limits={startAt: null, endAt: undefined}]
 */
module.exports.key.transformed = async (reference, maxPageSize, transformer, limits) => await transformPaginatedKeyCursorReference(module.exports.key.transformed, reference, maxPageSize, transformer, limits)

/**
 * @template T
 *
 * @param {Function} caller
 * @param {Reference} reference
 * @param {number} maxPageSize
 * @param {Transformer<T>} transformer
 * @param {CursorLimits} [limits={startAt: null, endAt: undefined}]
 */
const transformPaginatedValueCursorReference = async (caller, reference, maxPageSize, transformer, limits) => await transformPaginatedCursorReference(caller, reference.orderByValue(), d => d.val(), limits, maxPageSize, transformer)

/**
 * @param {Reference} reference
 * @param {number} maxPageSize
 * @param {CursorLimits} [limits={startAt: null, endAt: undefined}]
 */
module.exports.value = async (reference, maxPageSize, limits) => await transformPaginatedValueCursorReference(module.exports.value, reference, maxPageSize, d => d, limits)
/**
 * @template T
 *
 * @param {Reference} reference
 * @param {number} maxPageSize
 * @param {Transformer<T>} transformer
 * @param {CursorLimits} [limits={startAt: null, endAt: undefined}]
 */
module.exports.value.transformed = async (reference, maxPageSize, transformer, limits) => await transformPaginatedValueCursorReference(module.exports.value.transformed, reference, maxPageSize, transformer, limits)

/**
 * @template T
 *
 * @param {Function} caller
 * @param {Reference} reference
 * @param {string} childKey
 * @param {number} maxPageSize
 * @param {Transformer<T>} transformer
 * @param {CursorLimits} [limits={startAt: null, endAt: undefined}]
 */
const transformPaginatedChildValueCursorReference = async (caller, reference, childKey, maxPageSize, transformer, limits) => await transformPaginatedCursorReference(caller, reference.orderByChild(childKey), d => d.child(childKey).val(), limits, maxPageSize, transformer)

/**
 * @param {Reference} reference
 * @param {string} childKey
 * @param {number} maxPageSize
 * @param {CursorLimits} [limits={startAt: null, endAt: undefined}]
 */
module.exports.child = async (reference, childKey, maxPageSize, limits) => await transformPaginatedChildValueCursorReference(module.exports.child, reference, childKey, maxPageSize, d => d, limits)
/**
 * @template T
 *
 * @param {Reference} reference
 * @param {string} childKey
 * @param {number} maxPageSize
 * @param {Transformer<T>} transformer
 * @param {CursorLimits} [limits={startAt: null, endAt: undefined}]
 */
module.exports.child.transformed = async (reference, childKey, maxPageSize, transformer, limits) => await transformPaginatedChildValueCursorReference(module.exports.child.transformed, reference, childKey, maxPageSize, transformer, limits)

