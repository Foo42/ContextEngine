var objectMatches = require('./objectMatches');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var userConfigurationAccess = require('./userConfigurationAccess');
var async = require('async');
var cron = require('cron');

module.exports = (function(){
	var module = {};

	module.attachListener = function(contextEngine, done){
		console.info('attatching state inference engine');
		var userConfig = userConfigurationAccess.forUser(contextEngine.user);
		async.waterfall(
			[
				userConfig.getStateConfig,
				function(stateConfigs, done){
					var taskScheduler = {
						setTimeout:setTimeout,
						clearTimeout:clearTimeout,
						createCronJob:function(spec, cb){return new cron.CronJob(spec, cb);}
					};
					var states = stateConfigs.states.map(function(stateConfig){return new module.State(stateConfig, taskScheduler)});			

					var listener = new module.StateInferenceEngine(states);
					contextEngine.on('event created', listener.processEvent);

					listener.on('stateChange.activated', function(event){contextEngine.registerNewEvent(event,function(){})});
					listener.on('stateChange.deactivated', function(event){contextEngine.registerNewEvent(event,function(){})});

					contextEngine.states = listener;
					done(null)			
				}
			],
			done
		);
	}

	module.StateInferenceEngine = function(states){		
		var self = this;

		states.forEach(function(state){
			state.on('activated', function(){
				var stateActivedEvent = {type:'stateChange.activated', stateName:state.name};
				self.emit('stateChange.activated', stateActivedEvent);
			});

			state.on('deactivated', function(){
				var stateActivedEvent = {type:'stateChange.deactivated', stateName:state.name};
				self.emit('stateChange.deactivated', stateActivedEvent);
			});
		});
		
		self.processEvent = function(event){
			states.forEach(function(state){state.processEvent(event)});
		}

		self.getActiveStates = function(){
			return states.filter(function(state){return state.active}).map(function(state){return state.name});
		}
	};

	module.State = function(config, taskScheduler){
		console.info('creating state');
		var self = this;

		Object.defineProperty(this, "name", {
            get:function(){return config.name},            
        });


        var getAllExitConditionsOfType = function(config, type){
			return getAllConditionsOfType(config.exitOn, type);
		}

		var getAllEntryConditionsOfType = function(config, type){
			return getAllConditionsOfType(config.enterOn, type);
		}

		var getAllConditionsOfType = function(config, type){
			if(!config){
				return [];
			}

			var conditionsOfType = [];
			if(config[type]){
				conditionsOfType.push(config[type]);
			}
			if(config.anyOf){
				conditionsOfType = conditionsOfType.concat(
					config.anyOf
						.filter(function(condition){return condition[type]})
						.map(function(matcher){return matcher[type]}));
			}

			return conditionsOfType;
		}

		var matchesEntryConditions = function(event){
			var entryMatchers = getAllEntryConditionsOfType(config, 'eventMatching');
			return _.any(entryMatchers, function(matcher){return objectMatches(event, matcher)});			
		}

		var matchesExitConditions = function(event){
			var exitMatchers = getAllExitConditionsOfType(config, 'eventMatching');
			
			return _.any(exitMatchers, function(matcher){return objectMatches(event, matcher)});
		}

		self.activate = function(){
			self.active = true;
			console.info('activating state ' + (self.name || 'unnamed'));
			self.emit('activated')
		}

		self.deactivate = function(){
			self.active = false;
			console.info('deactivating state ' + (self.name || 'unnamed'));
			self.emit('deactivated')
		}

		self.processEvent = function(event){
			if(!self.active && matchesEntryConditions(event)){
				self.activate();
			}
			if(self.active && matchesExitConditions(event)){
				self.deactivate();
			}
		}

		var setup = function setup(){
        	var timeouts = [];
        	var exitCrons = [];
        	var entryCrons = [];

        	self.active = (config.initialState && config.initialState === 'active') || false;

        	var setupAnyExitTimeouts = function setupAnyExitTimeouts(config){
        		var timeoutConditions = getAllExitConditionsOfType(config, 'afterDelay');
        		timeoutConditions.forEach(function(timeout){
        			timeouts.push(taskScheduler.setTimeout(self.deactivate, 1000 * timeout.seconds));
        		});
        	}

        	var setupAnyExitCronJobs = function setupAnyExitCronJobs(config){
        		var cronConditions = getAllExitConditionsOfType(config, 'cron');
        		cronConditions.forEach(function(cron){
        			var cronJob = taskScheduler.createCronJob(cron, self.deactivate);
        			exitCrons.push(cronJob);
        			if(self.active){cronJob.start()};
        		})
        	}
        	setupAnyExitCronJobs(config);

        	var setupAnyEntryCronJobs = function setupAnyEntryCronJobs(config){
        		if(config.enterOn && config.enterOn.cron){
        			var cronJob = taskScheduler.createCronJob(config.enterOn.cron, self.activate);
        			entryCrons.push(cronJob);
        			if(!self.active){cronJob.start()};
        		}
        	}
        	setupAnyEntryCronJobs(config);

        	self.on('activated', function(){
	        	setupAnyExitTimeouts(config);
	        	entryCrons.forEach(function(cronJob){cronJob.stop()});
	        	exitCrons.forEach(function(cronJob){cronJob.start()});
        	});

        	self.on('deactivated', function(){
        		timeouts.forEach(function(timeout){taskScheduler.clearTimeout(timeout)});
				exitCrons.forEach(function(cronJob){cronJob.stop()});
        		entryCrons.forEach(function(cronJob){cronJob.start()});
        		timeouts = [];
        	});        	
        };
        setup();
	}

	util.inherits(module.State, EventEmitter);
	util.inherits(module.StateInferenceEngine, EventEmitter);

	return module;
})();