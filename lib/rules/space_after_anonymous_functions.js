var assert = require('assert');

var Rule = require('../Rule');
var util = require('../util');


function SpaceAfterAnonymousFunctionsRule() {
	SpaceAfterAnonymousFunctionsRule.super_.apply(this, arguments);
}

module.exports = util.inherits(SpaceAfterAnonymousFunctionsRule, Rule, {

	name: 'space_after_anonymous_functions',

	supportedSettings: {
		space_after_anonymous_functions: [true, false]
	},

	infer: function(sample, callback) {
		var previousTokens = new Array(2);
		var present = 0;
		var omitted = 0;

		sample.on('data', function(token) {
			if (this.isFunctionKeyword(previousTokens[0])) {
				if (this.isOpenParen(previousTokens[1])) {
					omitted++;
				} else {
					assert(this.isWhitespaces(previousTokens[1]));
					if (this.isOpenParen(token)) {
						// Anonymous function.
						if (previousTokens[1].value === ' ') {
							present++;
						}
					} else {
						// Named function.
						assert(this.isIdentifier(token));
					}
				}
			}
			previousTokens.shift();
			previousTokens.push(token);
		}.bind(this));

		sample.on('end', function() {
			callback({space_after_anonymous_functions: present > omitted});
		});
	},

	transform: function(input) {
		Rule.prototype.transform.apply(this, arguments);
		if (!this.enforceRule) {
			return;
		}

		this.insertSpace = this.settings['space_after_anonymous_functions'];
		this.removeSpace = !this.insertSpace;

		this.prevTokens = new Array(2);
		input.on('data', this.onTransformData.bind(this));
		input.on('end', this.onTransformEnd.bind(this));
	},

	onTransformData: function(token) {
		if (this.isFunctionKeyword(this.prevTokens[1])) {
			if (this.isOpenParen(token)) {
				if (this.insertSpace)
					this.output.write(this.tokens.space);
				this.output.write(token);
			} else {
				assert(this.isWhitespaces(token));
				// Omit until we know if it's an anonymous function.
			}
		} else if (this.isFunctionKeyword(this.prevTokens[0]) &&
		this.isWhitespaces(this.prevTokens[1])) {

			if (this.isOpenParen(token)) {
				// Anonymous function.
				if (this.insertSpace)
					this.output.write(this.tokens.space);
			} else {
				// Named function.
				assert(this.isIdentifier(token));
				this.output.write(this.prevTokens[1]);
			}
			this.output.write(token);
		} else {
			this.output.write(token);
		}
		this.prevTokens.shift();
		this.prevTokens.push(token);
	}

});
