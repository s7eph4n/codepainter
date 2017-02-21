var assert = require('assert');

var Rule = require('../Rule');
var util = require('../util');


function InsertFinalNewlineRule() {
	InsertFinalNewlineRule.super_.apply(this, arguments);
}

module.exports = util.inherits(InsertFinalNewlineRule, Rule, {

	name: 'insert_final_newline',

	supportedSettings: {
		insert_final_newline: [true, false]
	},

	infer: function(sample, callback) {
		var previousToken = null;

		sample.on('data', function(token) {
			previousToken = token;
		});

		sample.on('end', function() {

			var value;

			if ((previousToken && previousToken.type === 'Whitespaces') &&
			(previousToken.value.indexOf('\n') !== -1)) {

				value = true;
			} else {
				value = false;
			}

			callback({insert_final_newline: value});
		});
	},

	transform: function(input) {
		Rule.prototype.transform.apply(this, arguments);
		if (!this.enforceRule) {
			return;
		}

		this.insertFinalNewline = this.settings['insert_final_newline'];
		this.prevToken = null;

		input.on('data', this.onTransformData.bind(this));
		input.on('end', this.onTransformEnd.bind(this));
	},

	onTransformData: function(token) {
		if (this.prevToken) {
			this.output.write(this.prevToken);
		}

		this.prevToken = token;
	},

	onTransformEnd: function() {
		var output = this.output;
		var token = this.prevToken;

		if (!this.insertFinalNewline) {
			while (this.hasFinalNewline(token)) {
				token.value = token.value.replace(/\r?\n$/, '');
			}
		}

		output.write(token);

		if (this.insertFinalNewline && !this.hasFinalNewline(token)) {
			output.write(this.tokens.EOL);
		}

		output.end();
	},

	hasFinalNewline: function(token) {
		return this.isWhitespaces(token) && /\r?\n$/.test(token.value);
	}

});
