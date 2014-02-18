var _ = require('lodash');

var fs = require('fs');
var file = __dirname + '/data/users.json';
var users = [];
fs.readFile(file, 'utf8', function(err, data){
	if(!err){
		console.log('loading users from json file');
		users = JSON.parse(data);
	}

});


var userHasEmailAddressOf = function(user, address){
	return user.emails.filter(function(email){return email.value.toLowerCase() == address.toLowerCase()}).length > 0;
}

module.export = {findUser: function(user, done){
	console.log("finding user for: " + JSON.stringify(user));
	var foundUser = _.any(users, function(registeredUser){
		return userHasEmailAddressOf(user, registeredUser.emailAddress);
	});

	if(!foundUser){
		done(err);
	}else{
		done(null, user);
	}
}}