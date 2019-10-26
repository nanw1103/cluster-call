const cluster = require('cluster')
//const clusterCall = require('cluster-call')
const node = require('../index.js')

//register a function on "this node".
//Master and child may have same or different methods
node.test = (a, b) => a + b

//register another method
node.test2 = (a, b) => a * b

if (cluster.isMaster) {
	let children = []
	for (let i = 0; i < 10; i++) {
		let c = cluster.fork()
		children.push(c)
	}

	function test(i) {
		node(children[i]).test(i, 3)
			.then(d => d === i + 3 ? 'ok' : Promise.reject('Error'))
			.catch(console.error)
		node(children[i]).test2(i, 4)
			.then(d => d === i * 4 ? 'ok' : Promise.reject('Error'))
			.catch(console.error)
	}

	for (let i = 0; i < 10; i++)
		test(i)
} else {
	node('master').test(3, 4)
		.then(d => d === 7 ? 'ok' : Promise.reject('Error'))
		.then(console.log)
		.catch(console.error)
		.then(process.exit)
}