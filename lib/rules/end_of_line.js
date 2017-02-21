var assert = require('assert');

var Rule = require('../Rule');
var util = require('../util');


function EndOfLineRule() {
	EndOfLineRule.super_.apply(this, arguments);
}

module.exports = util.inherits(EndOfLineRule, Rule, {

	name: 'end_of_line',

	supportedSettings: {
		end_of_line: ['crlf', 'lf']
	},

	infer: function(sample, callback) {
		this.callback = callback;
		this.lfs = 0;
		this.crlfs = 0;

		sample.on('data', this.onInferData.bind(this));
		sample.on('end', this.onInferEnd.bind(this));
	},

	onInferData: function(token) {
		if (!this.isWhitespaces(token)) {
			return;
		}

		var eols = token.value.match(/\r?\n/g);
		if (!eols) {
			return;
		}

		var crlfs = token.value.match(/\r\n/g);
		crlfs = crlfs && crlfs.length || 0;
		this.crlfs += crlfs;

		this.lfs += eols.length - crlfs;
	},

	onInferEnd: function() {
		this.callback({
			end_of_line: (this.crlfs > this.lfs) ? 'crlf' : 'lf'
		});
	},

	transform: function(input) {
		Rule.prototype.transform.apply(this, arguments);
		if (!this.enforceRule) {
			return;
		}
		this.EOL = (this.settings['end_of_line'] === 'lf') ? '\n' : '\r\n';
		input.on('data', this.onTransformData.bind(this));
		input.on('end', this.onTransformEnd.bind(this));
	},

	onTransformData: function(token) {
		if (this.hasNewline(token)) {
			token.value = token.value.replace(/\r?\n/g, this.EOL);
		}
		this.output.write(token);
	}

});
