var editorconfig = require('editorconfig');
var fs = require('fs');
var stream = require('stream');

var CodePainterError = require('./Error');
var CodePainterObject = require('./Object');
var Inferrer = require('./Inferrer');
var util = require('./util');


function MultiInferrer() {
	MultiInferrer.super_.apply(this, arguments);
}

module.exports = util.inherits(MultiInferrer, CodePainterObject, {

	name: 'MultiInferrer',

	infer: function(globs, options, callback, Rule) {

		if (typeof options === 'function') {
			Rule = callback;
			callback = options;
			options = undefined;
		}

		this.options = options || {};
		this.callback = callback;
		this.Rule = Rule;
		this.style = {};

		if (typeof globs === 'string' || globs instanceof stream.Readable) {
			this.onGlobPath(globs);
		} else if (globs && globs[0] instanceof stream.Readable) {
			this.onGlobPath(globs[0]);
		} else {
			util.reduceGlobs(globs, this.onGlobPaths.bind(this));
		}
	},

	onGlobPaths: function(paths) {
		this.pathsFound = paths.length;
		paths.forEach(this.onGlobPath.bind(this));
	},

	onGlobPath: function (path) {
		var inferrer = new Inferrer();
		if (typeof path === 'string') {
			if (!fs.statSync(path).isFile()) {
				return;
			}
			var editorConfigStyle = editorconfig.parse(path);
			if (editorConfigStyle.codepaint === false) {
				this.finalizeScores();
				return;
			}
		}
		inferrer.infer(path, this.updateScore.bind(this), this.Rule);
	},

	updateScore: function(style) {
		Object.keys(style).forEach(function(key) {
			var rule = this.style[key];
			if (!rule) {
				rule = this.style[key] = {};
			}
			var setting = style[key];
			rule[setting] = (rule[setting] || 0) + 1;
		}.bind(this));
		this.finalizeScores();
	},

	finalizeScores: function() {
		if (--this.pathsFound) {
			return;
		}
		if (!this.options.details) {
			Object.keys(this.style).forEach(this.identifyTrend.bind(this));
			this.parseValues();
		}
		this.callback(this.style);
	},

	identifyTrend: function(key) {
		var rule = this.style[key];
		var trend, max = -1;
		Object.keys(rule).forEach(function(setting) {
			var score = parseInt(rule[setting], 10);
			if (score > max) {
				max = score;
				trend = setting;
			}
		});
		this.style[key] = trend;
	},

	parseValues: function() {
		Object.keys(this.style).forEach(function(key) {
			try {
				this.style[key] = JSON.parse(this.style[key]);
			} catch(e) {
			}
		}.bind(this));
	}

});
