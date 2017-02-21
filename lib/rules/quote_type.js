var assert = require('assert'),
string = require('../util/string');

var Rule = require('../Rule');
var util = require('../util');


function QuoteTypeRule() {
	QuoteTypeRule.super_.apply(this, arguments);
}

module.exports = util.inherits(QuoteTypeRule, Rule, {

	name: 'quote_type',

	supportedSettings: {
		quote_type: ['single', 'double', 'auto']
	},

	quoteMap: {
		'double': '"',
		'single': "'"
	},

	typeMap: {
		'"': 'double',
		"'": 'single'
	},

	regexMap: {
		'double': {
			escaped: /"\\/g,
			unescaped: /("(\\\\)*)(?!\\)/g
		},
		'single': {
			escaped: /'\\/g,
			unescaped: /(\'(\\\\)*)(?!\\)/g
		}
	},

	infer: function(sample, callback) {
		var doubleQuotes = 0,
		totalCount = 0;

		sample.on('data', function(token) {
			if (token.type === 'String') {
				totalCount++;
				if (token.value[0] === '"') {
					doubleQuotes++;
				}
			}
		}.bind(this));

		sample.on('end', function() {
			var singleQuotes = totalCount - doubleQuotes;
			var style = {};
			style[this.name] = function() {
				if (doubleQuotes > 0 && singleQuotes === 0) {
					return 'double';
				} else if (singleQuotes > 0 && doubleQuotes === 0) {
					return 'single';
				} else {
					return 'auto';
				}
			}();
			callback(style);
		}.bind(this));
	},

	transform: function(input, settings, output) {
		Rule.prototype.transform.apply(this, arguments);
		if (!this.enforceRule) {
			return;
		}

		this.quoteType = settings['quote_type'];

		input.on('data', this.onTransformData.bind(this));

		input.on('end', function() {
			output.end();
		}.bind(this));
	},

	onTransformData: function(token) {
		if (token.type === 'String') {
			token.value = this.changeQuotes(token.value);
		}
		this.output.write(token);
	},

	changeQuotes: function(string) {
		var currentLiteral = string[0];
		var currentType = this.typeMap[currentLiteral];

		if (this.quoteType === currentType) {
			return string;
		}

		var value = string.substring(1, string.length - 1).reverse();

		var newQuoteType = this.quoteType;
		if (this.quoteType === 'auto') {
			newQuoteType = this.inferLiteral(value);
		}

		var settingLiteral = this.quoteMap[newQuoteType];

		// Remove redundant escaping.
		value = value.replace(this.regexMap[currentType].escaped, currentLiteral);
		// Add new escaping.
		value = value.replace(this.regexMap[newQuoteType].unescaped, settingLiteral + '\\');
		return settingLiteral + value.reverse() + settingLiteral;
	},

	inferLiteral: function(string) {
		var m = string.match(/"/g);
		var doubles = m && m.length;
		m = string.match(/'/g);
		var singles = m && m.length;
		return (singles && singles > doubles) ? 'double' : 'single';
	}

});
