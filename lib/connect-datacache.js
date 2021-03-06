
var debug = require('debug')('connect:datacache');
var DCClient = require('./wxs');
var dcc, dccCreds; // instance of the data cache
// connect-redis used as a guide



if ( process.env.VCAP_APP_PORT ) {
  // We are in cloudfoundry
  if (process.env.VCAP_SERVICES)
    var env = JSON.parse(process.env.VCAP_SERVICES);
} else {
  // We are testing
  // var env = JSON.parse(VCAP_SERVICES);
}

if ( env &&
     env['DataCache-1.0'] &&
     env['DataCache-1.0'][0] &&
     env['DataCache-1.0'][0].credentials ) {
  // Create the DataCache client
  dccCreds = env['DataCache-1.0'][0].credentials
} else {
  console.log('Warning, cannot get Elastic Cache service instance credentials.');
}


module.exports = function (session) {

	var Store = session.Store;

	function DataCacheStore (options) {
		// TODO decide if we want our dc credentials via init options (connect-redis style)
		// or just have it pull in the CF environment vars as above...
		if (!dccCreds) {
			console.log("Warning, no DataCache credentials found in environment vars");
			if (!options) return;
			dccCreds = options; // fallback to passed credentials object
		}
		Store.call(this, options); // superclass

		this.client = new DCClient(dccCreds);
		console.log('connect-datacache connection:', this.client);
	}


	DataCacheStore.prototype.__proto__ = Store.prototype;

	// get session by session id

	DataCacheStore.prototype.get = function (sid, fn) {
		console.log('connect-datacache get:', sid);
		if (!sid) return fn("no sid error");
		this.client.get(null, sid, function(result){
			
			if (result instanceof Error) {
				return fn(result);
			}
			console.log('connect-datacache client get:', result.status);
			try {
			  result = JSON.parse(result.responseText);
			}
			catch (er) {
			  return fn(er);
			}
			fn(null, result);
		});
	}

	DataCacheStore.prototype.set = function (sid, sess, fn) {
		var ctype = "application/json";
		var size = null; // let it be ehhh or find size in k
		console.log('connect-datacache set:', sid, sess);
		sess = JSON.stringify(sess);
		size = sess.length;
		this.client.put(null, sid, sess, ctype, size, function(err){
			// fn
			if (err instanceof Error) {
				return fn(err);
			}

			fn(null);
		});

	}

	DataCacheStore.prototype.destroy = function (sid, fn) {
		console.log('connect-datacache destroy:', sid);
		this.client.remove(null, sid, function(err){
			if (err instanceof Error) {
				return fn(err);
			}
			fn(null);
		});
	}

	// express-session deprecated undefined resave option; provide resave option app.js:52:13
	// express-session deprecated undefined saveUninitialized option; provide saveUninitialized option app.js:52:13

	return DataCacheStore;
}