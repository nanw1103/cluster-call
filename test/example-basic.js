const cluster = require('cluster')
//const clusterCall = require('cluster-call')
const node = require('../index.js')

//register a function on "this node". 
//Master and child may have same or different methods
node.test = (a, b) => a + b

if (cluster.isMaster) {
	let worker1 = cluster.fork()
	
	//call method 'test' on worker1
	node(worker1).test(33, 44)
		.then(d => console.log('master receives', d))
		.catch(console.error)
} else {
	//call method 'test' on master
	node('master').test(3, 4)
		.then(d => console.log('child receives', d))
		.catch(console.error)
		.then(process.exit)
}