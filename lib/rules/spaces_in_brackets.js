var assert = require('assert');

var Rule = require('../Rule');
var util = require('../util');


function SpacesInBracketsRule() {
	SpacesInBracketsRule.super_.apply(this, arguments);
}

module.exports = util.inherits(SpacesInBracketsRule, Rule, {

	name: 'spaces_in_brackets',

	supportedSettings: {
		spaces_in_brackets: [true, false, 'hybrid']
	},

	brackets: ['(', '[', '{', ')', ']', '}'],

	openBrackets: ['(', '[', '{'],

	closeBrackets: [')', ']', '}'],

	infer: function(sample, callback) {
		this.prevTokens = new Array(2);
		this.trueTrend = 0;
		this.falseTrend = 0;
		this.callback = callback;

		sample.on('data', this.onInferData.bind(this));
		sample.on('end', this.onInferEnd.bind(this));
	},

	onInferData: function(token) {

		this.setFriendlyTokenNames(token);

		if (this.isTrueStyle()) {
			this.trueTrend++;
		} else if (this.isFalseStyle()) {
			this.falseTrend++;
		}

		this.shiftTokens(token);
	},

	setFriendlyTokenNames: function(token) {
		this.token = token;
		this.prevToken = this.prevTokens[1];
		this.prevPrevToken = this.prevTokens[0];
	},

	isTrueStyle: function() {
		return this.hasSpaceInsideOpenBracket() || this.hasSpaceInsideCloseBracket();
	},

	isFalseStyle: function() {
		return this.hasNonSpaceInsideBracket();
	},

	shiftTokens: function() {
		this.prevTokens.shift();
		this.prevTokens.push(this.token);
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

		this.callback({spaces_in_brackets: setting});
	},

	transform: function(input) {
		Rule.prototype.transform.apply(this, arguments);
		if (!this.enforceRule) {
			return;
		}

		this.prevTokens = new Array(2);

		switch (this.settings['spaces_in_brackets']) {
			case true:
				input.on('data', this.onTrueTransformData.bind(this));
				input.on('end', this.onTransformEnd.bind(this));
				break;
			case false:
				input.on('data', this.onFalseTransformData.bind(this));
				input.on('end', this.onTransformEnd.bind(this));
				break;
			case 'hybrid':
				input.on('data', this.onHybridTransformData.bind(this));
				input.on('end', this.onTransformEnd.bind(this));
				break;
		}
	},

	onTrueTransformData: function(token) {
		this.setFriendlyTokenNames(token);

		if (this.hasNonSpaceInsideBracket()) {
			this.output.write(this.tokens.space);
		}

		this.onAfterEachTransformData();
	},

	hasNonSpaceInsideBracket: function() {
		if (this.isOpenBracket(this.prevToken) && !this.isWhitespaces(this.token)) {
			return true;
		}
		if (!this.isWhitespaces(this.prevToken) && this.isCloseBracket(this.token)) {
			return true;
		}
		return false;
	},

	hasCloseParenThenOpenCurlyBrace: function() {
		return this.isCloseParen(this.prevToken) && this.isOpenCurlyBrace(this.token);
	},

	onAfterEachTransformData: function() {
		if (this.hasCloseParenThenOpenCurlyBrace()) {
			this.output.write(this.tokens.space);
		}
		if (this.isWhitespaces(this.prevToken)) {
			this.output.write(this.prevToken);
		}
		if (!this.isWhitespaces(this.token)) {
			this.output.write(this.token);
		}
		this.shiftTokens();
	},

	onFalseTransformData: function(token) {
		this.setFriendlyTokenNames(token);

		if (this.hasSpaceInsideOpenBracket()) {
			token.value = '';
		} else if (this.hasSpaceInsideCloseBracket()) {
			this.prevToken.value = '';
		}

		this.onAfterEachTransformData();
	},

	hasSpaceInsideOpenBracket: function() {
		return this.isOpenBracket(this.prevToken) && this.isWhitespacesSansNewline(this.token);
	},

	hasSpaceInsideCloseBracket: function() {
		return this.isWhitespacesSansNewline(this.prevToken) && this.isCloseBracket(this.token);
	},

	onHybridTransformData: function(token) {
		this.setFriendlyTokenNames(token);

		if (this.shouldHybridRemoveSpace()) {
			this.prevToken.value = '';
		}

		if (this.shouldHybridAddSpace()) {
			this.output.write(this.tokens.space);
		}

		this.onAfterEachTransformData();
	},

	shouldHybridRemoveSpace: function() {
		return this.hasBracketSpaceBracket() || this.hasBracketSpaceFunction();
	},

	hasBracketSpaceBracket: function() {
		if (this.isWhitespacesSansNewline(this.prevToken)) {
			if (this.isCloseBracket(this.prevPrevToken) && this.isOpenBracket(this.token)) {
				return false;
			}
			if (this.isBracket(this.prevPrevToken) && this.isBracket(this.token)) {
				return true;
			}
		}
		return false;
	},

	hasBracketSpaceFunction: function() {
		return this.isOpenBracket(this.prevPrevToken) &&
		this.isWhitespacesSansNewline(this.prevToken) &&
		this.isFunctionKeyword(this.token);
	},

	shouldHybridAddSpace: function() {
		if (this.isOpenBracket(this.prevToken) && !this.isWhitespaces(this.token) &&
			 !this.isBracket(this.token) && !this.isFunctionKeyword(this.token)) {
			return true;
		}
		if (this.isCloseBracket(this.token) &&
			 !this.isWhitespaces(this.prevToken) && !this.isBracket(this.prevToken)) {
			return true;
		}
		return false;
	},

	onTransformEnd: function() {
		this.token && this.output.write(this.token);
		this.output.end();
	},

	isBracket: function(token) {
		return this.isPunctuator(token) && this.brackets.indexOf(token.value) !== -1;
	},

	isOpenBracket: function(token) {
		return this.isPunctuator(token) && this.openBrackets.indexOf(token.value) !== -1;
	},

	isCloseBracket: function(token) {
		return this.isPunctuator(token) && this.closeBrackets.indexOf(token.value) !== -1;
	}

});
