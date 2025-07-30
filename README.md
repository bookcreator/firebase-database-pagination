# Firebase Database Pagination 
[![Node.js CI](https://github.com/bookcreator/firebase-database-pagination/workflows/Node.js%20CI/badge.svg)](https://github.com/bookcreator/firebase-database-pagination/actions?query=workflow%3A%22Node.js+CI%22)

Allows pagination for the Firebase RTDB.

## Usage

All the normal methods return an array of [`DataSnapshot`s](https://firebase.google.com/docs/reference/admin/node/admin.database.DataSnapshot).

### Keys

To paginate over all the keys of a node you can use:

```js
const pagination = require('firebase-database-pagination')
const admin = require('firebase-admin').initializeApp()

const children = await pagination.key(admin.database().ref('node'), 10)
```

This will fetch all children of `node` in batches of 10.


### Value

To paginate over keys order by the nodes value you can use:

```js
const pagination = require('firebase-database-pagination')
const admin = require('firebase-admin').initializeApp()

const children = await pagination.value(admin.database().ref('node'), 10)
```


### Child

To paginate over all the keys of a node order by a childs key you can use:

```js
const pagination = require('firebase-database-pagination')
const admin = require('firebase-admin').initializeApp()

const children = await pagination.child(admin.database().ref('node'), 'childKey', 10)
```

## Transform parameter

The `.key`, `.value` and `.child` methods have a `.transformed` function property which allows each result to be converted to something else if needed.

The `transformer` parameter can return a value or a promised value.

```js
const pagination = require('firebase-database-pagination')
const admin = require('firebase-admin').initializeApp()

const values = await pagination.key.transformed(admin.database().ref('node'), 10, nodeChildSnapshot => {
   return { key: nodeChildSnapshot.key, value: nodeChildSnapshot.child('count') }
})
// values is an array of { key, count }

const values = await pagination.key.transformed(admin.database().ref('node'), 10, async nodeChildSnapshot => {
   return await admin.database().ref('other').child(nodeChildSnapshot.key)
})
// values is an array of DataSnaphots pointing at /other/<nodeChildKey>
```

## Stopping iteration early

The `.key`, `.value` and `.child` methods have a `.forEach` function property which allows iteration in a similar maner to `DataSnapshot#forEach`, returning a truthy value to stop iteration early.

```js
const pagination = require('firebase-database-pagination')
const admin = require('firebase-admin').initializeApp()

const stopped = await pagination.key.forEach(admin.database().ref('node'), 10, nodeChildSnapshot => {
   return nodeChildSnapshot.child('valid').exists()
})
// stopped will be true if any child node had a `valid` child.
```

## Limiting the query

All of the methods except a parameter to return a subset of values.

```js
const pagination = require('firebase-database-pagination')
const admin = require('firebase-admin').initializeApp()

// Return all keys where the value is equal to 10
await pagination.value(admin.database().ref('node'), 10, { equalTo: 10 })

// Return all keys where the value is greater then or equal to 10
await pagination.value(admin.database().ref('node'), 10, { startAt: 10 })

// Return all keys where the value is less then or equal to 20
await pagination.value(admin.database().ref('node'), 10, { endAt: 20 })

// Return all keys where the value is greater then or equal to 15 AND less than or equal to 25 (i.e. in the interval [15, 25])
await pagination.value(admin.database().ref('node'), 10, { startAt: 15, endAt: 25 })
```
