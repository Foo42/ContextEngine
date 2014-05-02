var assert = require("assert");
var pathEndsWith = require('./testUtils').pathEndsWith;
var proxyquire = require('proxyquire');
var path = require('path');


describe('userConfigurationAccess', function(){
	console.log(it);
	describe('accessing config for specific user', function(){
		var userConfigurationAccess = require('../core/userConfigurationAccess');
		it('should return an object for accessing config of a user', function(done){
			var fakeUser = {id:'someone'};
			assert.ok(userConfigurationAccess.forUser(fakeUser));
			done();
		});
	});

	describe('user specific config access object', function(){
		var stubfs = {};
		beforeEach(function(done){
			delete stubfs.readFile;
			delete stubfs.watch;
			done();
		});

		var userConfigurationAccess = proxyquire('../core/userConfigurationAccess', {'fs':stubfs});	

		describe('accessing state config', function(){					
			it('should return state config from the users state config file in their data dir', function(done){
				var fakeUser = {id:'someone'};
				
				stubfs.readFile = function(path, cb){
					var fakeConfig = {states:[{name:'test',enterOn:{eventMatching:{text:'enter'}}}]};

					if(pathEndsWith(path, '/data/userSpecific/someone/config/stateConfig.json')){
						return cb(null,JSON.stringify(fakeConfig))
					}
					cb('wrong path');					
				}
				

				var access = userConfigurationAccess.forUser(fakeUser);
				access.getStateConfig(function(err, config){
					assert.ok(config);
					assert.equal(config.states.length,1);
					done();
				});
			});

			it('should add a sha to each state rule on load',function(done){
				var fakeUser = {id:'someone'};

				stubfs.readFile = function(path, cb){
					var fakeConfig = {states:[{name:'test'}, {name:'another'}]};
					return cb(null,JSON.stringify(fakeConfig))					
				}				

				var access = userConfigurationAccess.forUser(fakeUser);
				access.getStateConfig(function(err, config){
					assert.ok(config.states.every(function(state){return state.sha}));
					done();
				});
			});
		});
		
		describe('Subscribing to state config', function(){
			it('should raise a config changed event when users state config file changes', function(done){
				var fakeUser = {id:'someone'};
				var config = {states:[{name:'test'}, {name:'another'}]};

				var fakeAFileChangeEvent;
				stubfs.watch = function(filename, options, callback){
					fakeAFileChangeEvent = callback.bind(callback, 'change', filename);
				};
				stubfs.readFile = function(path, cb){					
					return cb(null,JSON.stringify(config))					
				};

				var access = userConfigurationAccess.forUser(fakeUser);
				access.watchStateConfig(function(newStateConfig){
					assert.equal(newStateConfig.states.length,3);
					done();
				});

				config.states.push({name:'newState'});
				fakeAFileChangeEvent();
			});

			it('should supply a delta parameter in config change callback which has added and removed rules',function(done){
				var fakeUser = {id:'someone'};
				var config = {states:[{name:'test'}, {name:'another'}]};

				var fakeAFileChangeEvent;
				stubfs.watch = function(filename, options, callback){
					fakeAFileChangeEvent = callback.bind(callback, 'change', filename);
				};
				stubfs.readFile = function(path, cb){					
					return cb(null,JSON.stringify(config))					
				};

				var access = userConfigurationAccess.forUser(fakeUser);
				access.watchStateConfig(function(newStateConfig, delta){
					assert.equal(delta.added.length, 1);
					assert.equal(delta.added[0].name, 'newly added');

					assert.equal(delta.removed.length, 1);
					assert.equal(delta.removed[0].name, 'test');
					
					done();
				});

				config.states = [{name:'another'}, {name:'newly added'}];				
				fakeAFileChangeEvent();
			});
		});
	});
});
