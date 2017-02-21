var async = require('async');
var glob = require('glob');
var util = require('util');


module.exports = {

	inherits: function(sub, sup, proto) {
		util.inherits(sub, sup);
		if (typeof proto !== 'undefined') {
			Object.keys(proto).forEach(function(key) {
				sub.prototype[key] = proto[key];
			});
		}
		return sub;
	},

	reduceGlobs: function(globs, callback) {
		var result = [];
		async.map(globs, onEachGlob, function(err, fileListList) {
			fileListList.forEach(function(fileList) {
				result.push.apply(result, fileList.filter(filterOutExisting));
			});
			callback(result);
		});
		function onEachGlob(globPattern, cb) {
			glob(globPattern, function(err, paths) {
				cb(null, paths);
			});
		}
		function filterOutExisting(file) {
			return result.indexOf(file) === -1;
		}
	}

};
