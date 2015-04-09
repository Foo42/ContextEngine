var rabbitPie = require('rabbit-pie');
var EventEmitter = require('events').EventEmitter;
var Promise = require('promise');

var generateEventId = (function () {
	var counter = 0;
	var pid = process.pid;
	return function () {
		return "" + pid + counter++ +(new Date().valueOf());
	};
})();

addEventMetadata = function (event) {
	event.metadata = event.metadata || {};
	event.metadata.time = event.metadata.time || new Date();
	event.metadata.id = event.metadata.id || generateEventId();
}

var unregisteredEventQueue = require('./unregisteredEventQueue');
var contextEventExchange = require('./contextEventExchange');
var bootstrap = Promise.all([unregisteredEventQueue, contextEventExchange]).then(function (results) {
	console.log('event stamper: inbound and outbound connections established');
	var inbound = results[0];
	var outbound = results[1];
	inbound.topicEmitter.on('#', function (msg) {
		try {
			msg = JSON.parse(msg);
		} catch (e) {
			console.warn('failed to parse incoming context event as json. Ignoring')
			return;
		}

		addEventMetadata(msg);

		outbound.publish('', msg);
	});
}).catch(function (e) {
	console.error('ERROR starting event stamper service:', e);
	process.exit(1);
});

bootstrap.then(function () {
	if (!process || !process.send) {
		return;
	}
	process.send(JSON.stringify({
		status: "ready"
	}));
}).catch(function (err) {
	console.log('badness', err);
	process.exit(1);
})
