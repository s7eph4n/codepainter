var CodePainterObject = require('./Object');
var util = require('./util');


function Rule() {
	Rule.super_.apply(this, arguments);
}

module.exports = util.inherits(Rule, CodePainterObject, {

	tokens: {
		space: {type: 'Whitespaces', value: ' '},
		emptyString: {type: 'Whitespaces', value: ''}
	},

	transform: function(input, settings, output) {
		this.input = input;
		this.settings = settings;
		this.output = output;
		this.validate();
		this.tokens.EOL = {type: 'Whitespaces', value: this.EOL};
	},

	validate: function() {
		this.enforceRule = true;
		var keys = Object.keys(this.settings);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var value = this.settings[key];
			var supported = this.supportedSettings[key];
			if (!supported) {
				continue;
			}
			var enforceRule = (typeof supported === 'function') ?
				supported(value) :
				supported.indexOf(value) !== -1;
			if (!enforceRule) {
				this.skipRule();
				break;
			}
		}
	},

	skipRule: function() {
		this.enforceRule = false;
		this.input.on('data', function(token) {
			this.output.write(token);
		}.bind(this));
		this.input.on('end', function() {
			this.output.end();
		}.bind(this));
	},

	onTransformEnd: function() {
		this.output.end();
	},

	endsWithNewline: function(token) {
		return token.value.substr(-1, 1) === '\n';
	},

	hasNewline: function(token) {
		return this.isWhitespaces(token) && token.value.indexOf('\n') !== -1;
	},

	isCloseCurlyBrace: function(token) {
		return this.isPunctuator(token) && token.value === '}';
	},

	isFunctionKeyword: function(token) {
		return token && token.type === 'Keyword' && token.value === 'function';
	},

	isIdentifier: function(token) {
		return token && token.type === 'Identifier';
	},

	isLineComment: function(token) {
		return token && token.type === 'LineComment';
	},

	isOnlySpaces: function(token) {
		return this.isWhitespaces(token) && /^ +$/.test(token.value);
	},

	isOpenCurlyBrace: function(token) {
		return this.isPunctuator(token) && token.value === '{';
	},

	isOpenParen: function(token) {
		return this.isPunctuator(token) && token.value === '(';
	},

	isCloseParen: function(token) {
		return this.isPunctuator(token) && token.value === ')';
	},

	isPunctuator: function(token) {
		return token && token.type === 'Punctuator';
	},

	isWhitespaces: function(token) {
		return token && token.type === 'Whitespaces';
	},

	isWhitespacesSansNewline: function(token) {
		return this.isWhitespaces(token) && !this.hasNewline(token);
	}

});
