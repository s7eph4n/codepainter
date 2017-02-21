var os = require('os');
var assert = require('assert');

var string = require('../util/string');
var Rule = require('../Rule');
var util = require('../util');


function TrimTrailingWhitespaceRule() {
	TrimTrailingWhitespaceRule.super_.apply(this, arguments);
}

module.exports = util.inherits(TrimTrailingWhitespaceRule, Rule, {

	name: 'trim_trailing_whitespace',

	supportedSettings: {
		trim_trailing_whitespace: [true, false]
	},

	infer: function(sample, callback) {

		var hasTrailingWhitespace = false;

		sample.on('data', function(token) {
			if (this.isWhitespaces(token) && /[\t ]\r?\n/.test(token.value)) {
				hasTrailingWhitespace = true;
			}
		}.bind(this));

		sample.on('end', function() {
			callback({trim_trailing_whitespace:!hasTrailingWhitespace});
		});
	},

	transform: function() {
		Rule.prototype.transform.apply(this, arguments);
		if (!this.enforceRule) {
			return;
		}

		if (!this.settings['trim_trailing_whitespace']) {
			this.skipRule();
			return;
		}

		this.bindEvents();
	},

	bindEvents: function() {
		this.input.on('data', this.onTransformData.bind(this));
		this.input.on('end', this.onTransformEnd.bind(this));
	},

	onTransformData: function(token) {
		if (this.isWhitespaces(token)) {
			token.value = token.value.replace(/[\t ]+(?=\r?\n)/g, '');
		}
		this.output.write(token);
	}

});
