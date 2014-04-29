var objectMatches = require('./objectMatches');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var userConfigurationAccess = require('./userConfigurationAccess');
var async = require('async');
var cron = require('cron');
var binaryState = require('./State').binaryState;


module.exports = (function(){
	var module = {};

	

	module.attachListener = function(contextEngine, done){
		console.info('attatching state inference engine');
		var userConfig = userConfigurationAccess.forUser(contextEngine.user);
		async.waterfall(
			[
				userConfig.getStateConfig,
				function(stateConfig, done){
					var taskScheduler = {
						setTimeout:setTimeout,
						clearTimeout:clearTimeout,
						createCronJob:function(spec, cb){return new cron.CronJob(spec, cb);}
					};
					
					var listener = new module.StateInferenceEngine();
					

					var stateQueryService = require('./State').stateQueryService(listener);
					var expressionFactory = require('./ContextExpression')(contextEngine, stateQueryService);
					
					async.map(stateConfig.states,
						function(stateConfig, done){
							binaryState.createRule(stateConfig, expressionFactory, done);
						}, 
						function(err, states){
							console.log('finished mapping state config to states: err: ' + err);
							states.forEach(function(state){listener.add(state)});
							
							listener.on('stateChange.activated', function(event){contextEngine.registerNewEvent(event,function(){})});
							listener.on('stateChange.deactivated', function(event){contextEngine.registerNewEvent(event,function(){})});

							contextEngine.states = listener;
							done(null)			
						}
					);
				}
			],
			done
		);
	}

	module.StateInferenceEngine = function(statesToAdd){		
		var self = this;
		var states = [];
		statesToAdd = statesToAdd || [];		

		self.add = function(state){
			states.push(state);

			state.on('activated', function(){
				var stateActivedEvent = {type:'stateChange.activated', stateName:state.name};
				self.emit('stateChange.activated', stateActivedEvent);
			});

			state.on('deactivated', function(){
				var stateActivedEvent = {type:'stateChange.deactivated', stateName:state.name};
				self.emit('stateChange.deactivated', stateActivedEvent);
			});
		};
		
		self.processEvent = function(event){
			states.forEach(function(state){state.processEvent(event)});
		};

		self.getActiveStates = function(){
			return states.filter(function(state){return state.active}).map(function(state){return state.name});
		};

		self.forEachState = function forEachState(iterator, callback){
			states.forEach(function(state){
				iterator(state);
			});
			callback &&	callback(null);
		};

		self.isStateActive = function isStateActive(stateName, callback){			
			var state = _.find(states, function(state){return state.name === stateName});
			var isActive = state && state.active;
			return callback(null, isActive);
		};

		statesToAdd.forEach(function(state){
			self.add(state);
		});
	};

	
	util.inherits(module.StateInferenceEngine, EventEmitter);

	return module;
})();