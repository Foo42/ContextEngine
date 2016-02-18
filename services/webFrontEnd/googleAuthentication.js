var path = require('path');
var logger = require('../../core/logger');
var inspect = require('util').inspect;

var initialise = function () {
	var passport = require('passport');
	var userAccess = require('../users/client');
	var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
	var hostName = process.env['HOST_NAME'];

	var authConfig = {
		client_secret: process.env['GOOGLE_CLIENT_SECRET'],
		client_id: process.env['GOOGLE_CLIENT_ID']
	};
	if (process.env['GOOGLE_AUTH_CONFIG_PATH']) {
		var fullPath = process.env['GOOGLE_AUTH_CONFIG_PATH'];
		authConfig = require(fullPath).web;
	}

	passport.serializeUser(function (user, done) {
		done(null, user);
	});

	passport.deserializeUser(function (obj, done) {
		done(null, obj);
	});

	passport.use(new GoogleStrategy({
			clientID: authConfig.client_id,
			clientSecret: authConfig.client_secret,
			callbackURL: "http://" + hostName + "/auth/google/callback"
		},
		function (accessToken, refreshToken, profile, done) {
			return done(null, profile);
		}
	));

	var ensureAuthenticated = function (req, res, next) {
		if (req.isAuthenticated()) {
			userAccess.isRegisteredUser(req.user).then(function (result) {
				if (result) {
					return next();
				}
				res.send(403).end();
			}).catch(function (err) {
				res.send(500).end();
			});
		} else {
			res.redirect('/login');
		}
	};

	var userHasEmailAddressOf = function (user, address) {
		return user.emails.filter(function (email) {
			return email.value.toLowerCase() == address.toLowerCase()
		}).length > 0;
	}

	return {
		insertMiddleware: function (app) {
			app.use(passport.initialize());
			app.use(passport.session());
		},

		setupRoutes: function (app) {

			app.get('/account', ensureAuthenticated, function (req, res) {
				res.render('account', {
					user: req.user
				});
			});

			app.get('/login', function (req, res) {
				res.render('login', {
					user: req.user
				});
			});

			app.get('/auth/google',
				passport.authenticate('google', {
					scope: ['https://www.googleapis.com/auth/userinfo.profile',
						'https://www.googleapis.com/auth/userinfo.email'
					]
				}),
				function (req, res) {
					// The request will be redirected to Google for authentication, so this
					// function will not be called.
				});
			app.get('/auth/google/callback',
				passport.authenticate('google', {
					failureRedirect: '/login'
				}),
				function (req, res) {
					res.redirect('/');
				});

			app.get('/logout', function (req, res) {
				req.logout();
				res.redirect('/');
			});
		},

		ensureAuthenticated: ensureAuthenticated,
	};

};

module.exports.initialise = initialise;
