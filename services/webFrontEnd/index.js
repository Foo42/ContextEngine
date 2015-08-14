var logger = require('../../core/logger');
var http = require('http');
var app = require('./app');
var connectToStatusNet = require('../../core/serviceStatus').connect();

connectToStatusNet.then(function (statusNet) {
	return statusNet.awaitOnline('users', 'eventStamper', 'historicalEventService', 'cron');
}).then(function () {
	logger.log('starting http server...');
	http.createServer(app).listen(app.get('port'), function () {
		logger.log('Express server listening on port ' + app.get('port'));

		process.send(JSON.stringify({
			status: "ready"
		}));
		connectToStatusNet.then(function (statusNet) {
			statusNet.beaconStatus();
		});
	});
});
