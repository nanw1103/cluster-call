const cluster = require('cluster')

let defaultTimeout = 10000
let seq_counter = 0
const pendingCalls = {}
const handlers = []

function isMessageObj(m) {
	return typeof m === 'object'
		&& (m.cmd === 'cluster-call.req' || m.cmd === 'cluster-call.resp')
}

if (cluster.isMaster) {
	cluster.on('message', (worker, message) => {
		if (!isMessageObj(message))
			return
		
		let cmd = message.cmd
		if (cmd === 'cluster-call.req') {
			handleRequest(worker, message.seq, message.topic, message.args)
		} else if (cmd === 'cluster-call.resp') {
			handleResponse(message.seq, message.error, message.result)
		}
	})
} else {
	process.on('message', message => {
		if (!isMessageObj(message))
			return
		
		let cmd = message.cmd
		if (cmd === 'cluster-call.req') {
			handleRequest(process, message.seq, message.topic, message.args)
		} else if (cmd === 'cluster-call.resp') {
			handleResponse(message.seq, message.error, message.result)
		}
	})
}

function handleRequest(peer, seq, topic, args) {
	let h = handlers[topic]
	
	if (!h) {
		response('Missing handler for topic: ' + topic)
		return
	}
	
	try {
		let ret = h.apply(null, args)
		if (ret instanceof Promise) {
			ret
				.then(data => response(null, data))
				.catch(response)
		} else {
			response(null, ret)
		}
	} catch (e) {
		response(e.toString())
	}
	
	function response(err, result) {
		let resp = {
			cmd: 'cluster-call.resp',
			seq: seq,
			result: result
		}
		if (err)
			resp.error = err
		peer.send(resp, err => {
			if (err) {
				//console.error(err.toString())
			}
		})
	}
}

function handleResponse(seq, error, result) {
	let pending = pendingCalls[seq]
	if (!pending) {
		return
	}
	pending.callback(error, result)
}

function _call(peer, topic, args) {
	let seq = ++seq_counter
	
	let msg = {
		cmd: 'cluster-call.req',
		seq: seq,
		topic: topic,
		args: args		
	}
	
	let pending
	let task = new Promise((resolve, reject) => {
		
		let timer = setTimeout(() => callback('timeout'), defaultTimeout)
		pending = {
			callback: callback,
			timer: timer
		}
		pendingCalls[seq] = pending
		
		peer.send(msg, err => {
			if (err)
				callback(err)
		})
	
		function callback(err, result) {
			delete pendingCalls[seq]
			clearTimeout(timer)
			if (err)
				reject(err)
			else
				resolve(result)
		}		
	})
	
	task.timeout = function(timeout) {
		clearTimeout(pending.timer)
		pending.timer = setTimeout(() => pending.callback('timeout'), timeout)
		return task
	}
	
	return task
}

function clusterCall(peer) {
	
	let callingMaster = peer === 'master'
	if (cluster.isMaster) {
		if (callingMaster)
			throw new Error('To call worker from master, do it like: clusterCall(worker).myFuncOnChild(...)')
	} else {
		if (!callingMaster)
			throw new Error('To call master from worker, do it like: clusterCall(\'master\').myFuncOnMaster(...)')
	}
	
	return new Proxy({}, {
		get: function(o, k) {
			return function() {
				let args = [].slice.call(arguments)
				let target = callingMaster ? process : peer
				return _call(target, k, args)
			}
		}
	})
}

const handler = {
	set: function(o, k, v) {
		if (typeof v === 'function') {
			handlers[k] = v
		}
		return v
	},
	
	get: function(o, k) {
		return handlers[k]
	}
}
const proxy = new Proxy(clusterCall, handler)

module.exports = proxy
