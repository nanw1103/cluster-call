const cluster = require('cluster')
//const clusterCall = require('cluster-call')
const node = require('../index.js')

//register a function on "this node". 
//Master and child may have same or different methods
node.test = () => new Promise(()=>0)	//never resolves

if (cluster.isMaster) {
	cluster.fork()
} else {
	node('master').test()
		.timeout(1000)	//specify a timeout value for this call. By default, timeout is 10 seconds
		.then(console.log)
		.catch(err => console.error('Rejected:', err))
		.then(process.exit)
}
