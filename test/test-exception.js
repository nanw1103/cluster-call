const cluster = require('cluster')
//const clusterCall = require('cluster-call')
const node = require('../index.js')

node.test = (a, b) => {
	throw new Error(`Demo error: a=${a}, b=${b}`)
}

if (cluster.isMaster) {
	let worker1 = cluster.fork()

	node(worker1).test(33, 44)
		.then(console.log)
		.catch(console.error)
} else {
	node('master').test(3, 4)
		.then(console.log)
		.catch(console.error)
		.then(process.exit)
}