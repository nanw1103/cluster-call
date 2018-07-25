# cluster-call
RPC between nodejs cluster master and workers. Javascript native and fluent style.

# Example - Basic

```javascript
const cluster = require('cluster')
const node = require('cluster-call')

//Register a function named 'test' on "this node". 
//Master and workers may have same or different methods
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
```
# Example - Specify timeout

```javascript
const cluster = require('cluster')
const node = require('cluster-call')

node.test = () => new Promise(() => 0)	//Never resolves

if (cluster.isMaster) {
	cluster.fork()
} else {
	node('master').test()
		.timeout(1000)	//specify a timeout value for this call. By default, timeout is 10 seconds
		.then(console.log)
		.catch(err => console.error('Rejected:', err))
		.then(process.exit)
}
```

