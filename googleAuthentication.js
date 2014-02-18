
var initialise = function(getContextEngineForUser){
	 var passport = require('passport');
	 var registeredUsers = require('./registeredUsers');
	 var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
	 var hostName = process.env['HOST_NAME'];
	 var clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
	 var clientID = process.env['GOOGLE_CLIENT_ID'];

	passport.serializeUser(function(user, done) {
	  done(null, user);
	});

	passport.deserializeUser(function(obj, done) {
	  //attach context engine here?
	  done(null, obj);
	});

	passport.use(new GoogleStrategy({
	    clientID: clientID,
	    clientSecret: clientSecret,
	    callbackURL: "http://"+hostName+"/auth/google/callback"
	  },
	  function(accessToken, refreshToken, profile, done) {
	    return done(null, profile);	    
	  }
	));

	var ensureAuthenticated = function(req, res, next) {
			console.log("ensureAuthenticated: " + req.isAuthenticated)
			if (req.isAuthenticated()){
				getContextEngineForUser(function(err, engine){
					if(!err){
						req.user.contextEngine = engine;
						return next();		
					}
				});
			}

		  	res.redirect('/login');
		};

	var userHasEmailAddressOf = function(user, address){
		return user.emails.filter(function(email){return email.value.toLowerCase() == address.toLowerCase()}).length > 0;
	}

	return 	{
		insertMiddleware: function(app){
			app.use(passport.initialize());
  			app.use(passport.session());
		},

		setupRoutes: function(app){
			

			app.get('/account', ensureAuthenticated, function(req, res){
			  res.render('account',{user:req.user});
			});

			app.get('/login', function(req, res){
			  res.render('login', { user: req.user });
			});

			app.get('/auth/google',
			  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile',
			                                            'https://www.googleapis.com/auth/userinfo.email'] }),
			  function(req, res){
			    // The request will be redirected to Google for authentication, so this
			    // function will not be called.
			});
			app.get('/auth/google/callback', 
			  passport.authenticate('google', { failureRedirect: '/login' }),
			  function(req, res) {
			    res.redirect('/');
			  });

			app.get('/logout', function(req, res){
			  req.logout();
			  res.redirect('/');
			});
		},

		ensureAuthenticated: ensureAuthenticated,
	};

};

module.exports.initialise = initialise;
