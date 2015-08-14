var Promise = require('bluebird');
var cron = require('cron');
var logger = require('../../core/logger');
var connectToStatusNet = require('../../core/serviceStatus').connect();

connectToStatusNet.then(function (statusNet) {
	return statusNet.awaitOnline('users', 'eventStamper', 'historicalEventService', 'cron');
}).then(function () {
	var bootstrap = require('./lib').start();

	bootstrap.then(function () {
		if (!process || !process.send) {
			return;
		}
		process.send(JSON.stringify({
			status: "ready"
		}));
		connectToStatusNet.then(function (statusNet) {
			statusNet.beaconStatus();
		});
	}).catch(function (err) {
		logger.log('badness', err);
		process.exit(1);
	});
});
