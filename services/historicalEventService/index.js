var http = require('http');
var Promise = require('bluebird');
var express = require('express');
var logger = require('../../core/logger');
logger.log('HistorialEventService starting...');
var historicalEventAccess = require('./lib/historicalEventAccess');
var eventsMatchingEventProvider = require('./lib/eventsMatchingEventProvider');
var connectToStatusNet = require('../../core/serviceStatus').connect();

process.once('exit', logger.log.bind(logger, 'recieved exit event'));

var app = express();

app.set('port', process.env.HISTORICAL_EVENT_SERVICE_PORT || 9110);
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);

connectToStatusNet.then(function awaitDependencies(statusNet) {
	return statusNet.awaitOnline('users', 'eventStamper');
}).then(function () {
	app.get('/events/recent', function (request, response, next) {
		var userId = request.param('userid');
		if (!userId) {
			return response.status(400).end();
		}
		historicalEventAccess.getRecentEventsForUser(userId).then(function (recentEvents) {
			response.json(recentEvents);
		}).catch(next);
	});

	http.createServer(app).listen(app.get('port'), function () {
		Promise.all([historicalEventAccess.start(), eventsMatchingEventProvider.start()]).then(function () {
			logger.log('announcing ready');
			if(process && process.send){
				process.send('{"status":"ready"}');
			}
			return connectToStatusNet.then(function (statusNet) {
				statusNet.beaconStatus();
			});
		}).catch(function(err){
			logger.error('Error starting application:',err);
			process.exit(1);
		});
	});
});
