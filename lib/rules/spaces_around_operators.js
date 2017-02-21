var assert = require('assert');

var Rule = require('../Rule');
var util = require('../util');


function SpacesAroundOperatorsRule() {
	SpacesAroundOperatorsRule.super_.apply(this, arguments);
}

module.exports = util.inherits(SpacesAroundOperatorsRule, Rule, {

	name: 'spaces_around_operators',

	supportedSettings: {
		spaces_around_operators: [true, false, 'hybrid']
	},

	operators: [
			'!', '~',
			'*', '/', '%',
			'+', '-',
			'<<', '>>', '>>>',
			'<', '<=', '>', '>=',
			'==', '!=', '===', '!==',
			'&', '^', '|', '&&', '||', '?', ':',
			'=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '^=', '|='
		],

	hybridGroupOperators: ['*', '/', '%'],

	infer: function(sample, callback) {
		this.prevToken = null;
		this.trueTrend = 0;
		this.falseTrend = 0;
		this.callback = callback;

		sample.on('data', this.onInferData.bind(this));
		sample.on('end', this.onInferEnd.bind(this));
	},

	onInferData: function(token) {
		this.token = token;
		if (!this.isException(token)) {
			if (this.isTrueStyle()) {
				this.trueTrend++;
			} else if (this.isFalseStyle()) {
				this.falseTrend++;
			}
		}
		this.prevToken = token;
	},

	isTrueStyle: function() {
		return this.hasOperatorThenSpaces() || this.hasSpacesThenOperator();
	},

	isFalseStyle: function() {
		return this.isOperatorAdjacentToNonspace();
	},

	onInferEnd: function() {
		var setting;

		if (this.trueTrend > this.falseTrend) {
			setting = (this.falseTrend === 0) ? true : 'hybrid';
		} else if (this.falseTrend > this.trueTrend) {
			setting = (this.trueTrend === 0) ? false : 'hybrid';
		} else {
			setting = null;
		}

		this.callback({spaces_around_operators: setting});
	},

	transform: function(input) {
		Rule.prototype.transform.apply(this, arguments);
		if (!this.enforceRule) {
			return;
		}

		this.prevToken = null;

		switch (this.settings['spaces_around_operators']) {
			case true:
				input.on('data', this.onTrueTransformData.bind(this));
				break;
			case false:
				input.on('data', this.onFalseTransformData.bind(this));
				break;
			case 'hybrid':
				input.on('data', this.onHybridTransformData.bind(this));
				break;
		}

		input.on('end', this.onTransformEnd.bind(this));
	},

	onTrueTransformData: function(token) {
		if (this.isNonConditionalColonOperator(token)) {
			this.onFalseTransformData(token);
			return;
		}

		this.token = token;
		var prevToken = this.prevToken;

		if (prevToken) {
			if (this.shouldRemoveTokenSpace()) {
				this.token.value = '';
			}
			this.output.write(prevToken);
		}
		if (this.isOperatorAdjacentToNonspace()) {
			this.output.write(this.tokens.space);
		}
		this.prevToken = token;
	},

	isOperatorAdjacentToNonspace: function() {
		if (this.hasOperatorThenNonspaces() && !this.isException(this.prevToken)) {
			return true;
		}
		if (this.hasNonspacesThenOperator() && !this.isException(this.token)) {
			return true;
		}
		return false;
	},

	isException: function(token) {
		return this.isUnary(token) || this.isNonConditionalColonOperator(token);
	},

	hasOperatorThenNonspaces: function() {
		return this.isOperator(this.prevToken) && !this.isWhitespaces(this.token);
	},

	hasNonspacesThenOperator: function() {
		return!this.isOnlySpaces(this.prevToken) && this.isOperator(this.token);
	},

	onFalseTransformData: function(token) {
		this.token = token;
		var prevToken = this.prevToken;
		if (this.hasOperatorThenSpaces()) {
			token.value = '';
		} else if (this.hasSpacesThenOperator()) {
			prevToken.value = '';
		}
		prevToken && this.output.write(prevToken);
		this.prevToken = token;
	},

	hasOperatorThenSpaces: function() {
		return this.isOperator(this.prevToken) && this.isOnlySpaces(this.token);
	},

	hasSpacesThenOperator: function() {
		return this.isOperator(this.token) && this.isOnlySpaces(this.prevToken);
	},

	onHybridTransformData: function(token) {
		if (this.isNonConditionalColonOperator(token)) {
			this.onFalseTransformData(token);
			return;
		}

		this.token = token;
		var prevToken = this.prevToken;

		if (prevToken) {
			if (this.shouldHybridRemoveTokenSpace()) {
				this.token.value = '';
			} else if (this.shouldHybridRemovePrevTokenSpace()) {
				prevToken.value = '';
			}
			this.output.write(prevToken);
			if (this.shouldHybridAddSpace()) {
				this.output.write(this.tokens.space);
			}
		}
		this.prevToken = token;
	},

	shouldRemoveTokenSpace: function() {
		return this.hasOperatorThenSpaces() && this.isUnary(this.prevToken);
	},

	shouldHybridRemoveTokenSpace: function() {
		return this.hasOperatorThenSpaces() && this.isHybridGroupToken(this.prevToken);
	},

	shouldHybridRemovePrevTokenSpace: function() {
		return this.hasSpacesThenOperator() && this.isHybridGroupToken(this.token);
	},

	isHybridGroupToken: function(token) {
		return this.isHybridGroupOperator(token) || this.isUnary(token);
	},

	shouldHybridAddSpace: function() {
		if (this.hasOperatorThenNonspaces() && !this.isHybridGroupToken(this.prevToken)) {
			return true;
		}
		if (this.hasNonspacesThenOperator() && !this.isHybridGroupToken(this.token)) {
			return true;
		}
		return false;
	},

	onTransformEnd: function() {
		this.token && this.output.write(this.token);
		this.output.end();
	},

	isOperator: function(token) {
		return this.isPunctuator(token) && ~this.operators.indexOf(token.value);
	},

	isNonConditionalColonOperator: function(token) {
		return this.isPunctuator(token) && token.value === ':' &&
			token.grammarToken.type !== 'ConditionalExpression';
	},

	isUnary: function(token) {
		return this.isOperator(token) && token.grammarToken.type === 'UnaryExpression';
	},

	isUnaryThenSpace: function() {
		return this.isUnary(this.prevToken) && this.isWhitespaces(this.token);
	},

	isHybridGroupOperator: function(token) {
		return this.isPunctuator(token) && ~this.hybridGroupOperators.indexOf(token.value);
	}

});
