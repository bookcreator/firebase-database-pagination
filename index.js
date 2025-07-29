/**
 * @typedef {import('@firebase/database-types').IteratedDataSnapshot} IteratedDataSnapshot
 * @typedef {import('@firebase/database-types').Reference} Reference
 */

/**
 * @template [D=void]
 * @callback Transformer<D>
 * @param {IteratedDataSnapshot} snapshot Child of provided reference
 * @returns {D | Promise<D>}
 */

/** @typedef {{ startAt?: any, endAt?: any } | { equalTo: any }} CursorLimits */

/**
 * @template T
 *
 * @param {Function} caller
 * @param {import('@firebase/database-types').Query} query
 * @param {(item: IteratedDataSnapshot) => any} valueGetter
 * @param {CursorLimits | undefined} limits
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

   limits = Object.assign({}, limits)
   if ('equalTo' in limits) limits = { startAt: limits.equalTo, endAt: limits.equalTo }
   /** @type {{ startAt: any, endAt: any }} */
   const _limits = Object.assign({ startAt: null, endAt: undefined }, limits)

   /** @typedef {{ startingKey: string | null, startAt: any }} Cursor */

   /** @param {Cursor} starting */
   const iterate = async starting => {
      /** @type {Promise<T>[]} */
      const transforms = []
      let cursorQuery = query
      if (valueGetter === orderByKeyGetter) {
         // Order by key
         if (_limits.endAt !== undefined && starting.startAt === _limits.endAt) {
            // Same as just getting this child
            const child = /** @type {IteratedDataSnapshot} */ (await cursorQuery.ref.child(_limits.endAt).get())
            if (!child.exists()) return { results: [], next: null }
            return { results: [await transformer(child)], next: null }
         }
         if (starting.startAt !== null) cursorQuery = cursorQuery.startAt(starting.startAt)
         if (_limits.endAt !== undefined) cursorQuery = cursorQuery.endAt(_limits.endAt)
      } else {
         // Order by value or child
         if (_limits.endAt !== undefined && starting.startAt === _limits.endAt) {
            if (starting.startingKey === null) {
               cursorQuery = cursorQuery.equalTo(_limits.endAt)
            } else {
               cursorQuery = cursorQuery.equalTo(_limits.endAt, starting.startingKey)
            }
         } else {
            if (starting.startingKey === null) {
               cursorQuery = cursorQuery.startAt(starting.startAt)
            } else {
               cursorQuery = cursorQuery.startAt(starting.startAt, starting.startingKey)
            }
            if (_limits.endAt !== undefined) cursorQuery = cursorQuery.endAt(_limits.endAt)
         }
      }
      const children = await cursorQuery.limitToFirst(maxPageSize).get()
      /** @type {Cursor?} */
      let next = null
      children.forEach(d => {
         if (d.key !== starting.startingKey) {
            transforms.push(Promise.resolve(transformer(d)))
            const nextStartAt = valueGetter(d)
            /* c8 ignore next */
            if (nextStartAt === undefined) throw new Error('valueGetter must non return undefined for a DataSnapshot')
            next = { startingKey: d.key, startAt: nextStartAt }
         }
      })
      const results = await Promise.all(transforms)
      if (children.numChildren() < maxPageSize) {
         // Returned less data than a full page, so no more items
         next = null
      }
      return { results, next }
   }

   /** @type {Cursor?} */
   let previous = { startingKey: null, startAt: _limits.startAt }
   /** @type {T[]} */
   const allResults = []
   do {
      const { results, next } = await iterate(previous)
      allResults.push(...results)
      previous = next
   } while (previous !== null)

   return allResults
}

/** @type {Transformer<string>} */
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
 * @template [T=IteratedDataSnapshot]
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
 * @template [T=IteratedDataSnapshot]
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
 * @template [T=IteratedDataSnapshot]
 *
 * @param {Reference} reference
 * @param {string} childKey
 * @param {number} maxPageSize
 * @param {Transformer<T>} transformer
 * @param {CursorLimits} [limits={startAt: null, endAt: undefined}]
 */
module.exports.child.transformed = async (reference, childKey, maxPageSize, transformer, limits) => await transformPaginatedChildValueCursorReference(module.exports.child.transformed, reference, childKey, maxPageSize, transformer, limits)

