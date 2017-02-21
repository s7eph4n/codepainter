var assert = require('assert');

var Rule = require('../Rule');
var util = require('../util');


function SpaceAfterControlStatementsRule() {
	SpaceAfterControlStatementsRule.super_.apply(this, arguments);
}

module.exports = util.inherits(SpaceAfterControlStatementsRule, Rule, {

	name: 'space_after_control_statements',

	supportedSettings: {
		space_after_control_statements: [true, false]
	},

	controlKeywords: ['if', 'for', 'switch', 'while', 'with'],

	infer: function(sample, callback) {

		this.callback = callback;

		this.prevToken = null;
		this.trueTrend = 0;
		this.falseTrend = 0;

		sample.on('data', this.onInferData.bind(this));
		sample.on('end', this.onInferEnd.bind(this));
	},

	onInferData: function(token) {
		this.token = token;
		if (this.isTrueStyle()) {
			this.trueTrend++;
		} else if (this.isFalseStyle()) {
			this.falseTrend++;
		}
		this.prevToken = token;
	},

	isTrueStyle: function() {
		return this.isControlKeyword(this.prevToken) && this.isWhitespaces(this.token);
	},

	isFalseStyle: function() {
		return this.isControlKeyword(this.prevToken) && !this.isWhitespaces(this.token);
	},

	onInferEnd: function() {
		var t = this.trueTrend;
		var f = this.falseTrend;
		var setting = (t > f) ? true : (f > t) ? false : null;
		this.callback({space_after_control_statements: setting});
	},

	transform: function(input) {
		Rule.prototype.transform.apply(this, arguments);
		if (!this.enforceRule) {
			return;
		}

		this.prevToken = null;

		switch (this.settings['space_after_control_statements']) {
			case true:
				input.on('data', this.onTrueTransformData.bind(this));
				break;
			case false:
				input.on('data', this.onFalseTransformData.bind(this));
				break;
		}

		input.on('end', this.onTransformEnd.bind(this));
	},

	onTrueTransformData: function(token) {
		if (this.isControlKeyword(this.prevToken)) {
			this.output.write(this.tokens.space);
			if (!this.isWhitespaces(token)) {
				assert(this.isOpenParen(token));
				this.output.write(token);
			}
		} else {
			this.output.write(token);
		}
		this.prevToken = token;
	},

	onFalseTransformData: function(token) {
		if (!this.isControlKeyword(this.prevToken)) {
			this.output.write(token);
			this.prevToken = token;
			return;
		}
		if (!this.isWhitespaces(token)) {
			assert(this.isOpenParen(token));
			this.output.write(token);
		}
		this.prevToken = token;
	},

	isControlKeyword: function(token) {
		return token && token.type === 'Keyword' && this.controlKeywords.indexOf(token.value) !== -1;
	}

});
