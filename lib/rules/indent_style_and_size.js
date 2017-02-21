var assert = require('assert');

var Rule = require('../Rule');
var util = require('../util');


function IndentStyleAndSizeRule() {
	IndentStyleAndSizeRule.super_.apply(this, arguments);
}

module.exports = util.inherits(IndentStyleAndSizeRule, Rule, {

	name: 'indent_style_and_size',

	supportedSettings: {
		indent_style: ['tab', 'space'],
		indent_size: function(value) {
			return!isNaN(value);
		}
	},

	noIndenting: [
			'BlockStatement',
			'Program',
			'NewExpression',
			'VariableDeclarator',
			'CallExpression',
			'FunctionExpression',
			'ObjectExpression'
		],

	postfixExpressions: [
			'LogicalExpression',
			'BinaryExpression',
			'UnaryExpression'
		],

	prepare: function(tree, contents) {
		this.noIndenting += this.postfixExpressions;
		this.annotateGrammarTree(tree, tree,-1, [0, contents.length], '');
	},

	annotateGrammarTree: function(tree, parent, parentLevel, parentRange, parentPath, parentLoc) {
		var level;
		var path;
		var range, loc;

		if (tree['range'] !== undefined) {// tree element has a range

			if (tree['range'][0] === parentRange[0] && parentPath !== '-Program' || // token is first token of parent token
			this.noIndenting.indexOf(tree['type']) !== -1 || // token is on the blacklist
			this.postfixExpressions.indexOf(parent['type']) !== -1 ||
			tree['type'] === 'IfStatement' && parent['type'] === 'IfStatement') {

				// do not indent
				level = parentLevel;
				path = parentPath + '-' + tree['type'];
				range = tree['range'];
				loc = tree['loc'];

			} else {

				level = parentLevel + 1;
				path = parentPath + '-' + tree['type'] + '+1';
				range = tree['range'];
				loc = tree['loc'];
			}

			tree['Indentation'] = tree['Indentation'] || {};
			tree['Indentation']['level'] = level;
			tree['Indentation']['path'] = path;
			tree['Indentation']['parent'] = parent.type;

		} else {
			level = parentLevel;
			path = parentPath;
			range = parentRange;
			loc = parentLoc;
		}

		for (var key in tree) {
			if (!(tree[key] instanceof Object) || (key === 'range')) {
				continue;
			}
			this.annotateGrammarTree(tree[key], tree, level, range, path, loc);
		}
	},

	infer: function(sample, callback) {
		this.callback = callback;

		this.characters = {};
		this.indent = 0;
		this.totalCount = 0;
		this.prevToken = null;

		sample.on('data', this.onInferData.bind(this));
		sample.on('end', this.onInferEnd.bind(this));
	},

	onInferData: function(token) {

		// FIXME: Handle if/for/while one-liners.
		// FIXME: Fix function argument/variable declaration alignment.
		if (this.isCloseCurlyBrace(token))
			this.indent--;
		if (this.isWhitespaces(this.prevToken) && this.indent > 0)
			this.processWhitespaces(this.prevToken);
		if (this.isOpenCurlyBrace(token))
			this.indent++;

		this.prevToken = token;
	},

	processWhitespaces: function(token) {
		var value = token.value;
		var newLinePos = value.lastIndexOf('\n');
		if (newLinePos === -1 || newLinePos === value.length - 1)
			return;
		value = value.substr(newLinePos + 1);

		var indentationType = this.indentation(value);
		if (indentationType) {
			var character = indentationType.character;
			var count = indentationType.count;
			if (typeof this.characters[character] === 'undefined')
				this.characters[character] = [];
			if (typeof this.characters[character][count] === 'undefined')
				this.characters[character][count] = 0;
			this.characters[character][count]++;
		}
		this.totalCount++;
	},

	onInferEnd: function() {
		var max = 0,
		mostCommon = {},
		sum = 0,
		value = null,
		fn = function(count, index) {
			if (count > max) {
				max = count;
				mostCommon = {character: this.toString(), width: index};
			}
			sum += count;
		};
		for (var character in this.characters) {
			this.characters[character].forEach(fn, character);
		}

		if (max > this.totalCount - sum)
			value = mostCommon;

		var settings = {};
		if (value && value.character === '\t') {
			settings.indent_style = 'tab';
		} else {
			settings.indent_style = 'space';
			settings.indent_size = value && value.width || 4;
		}

		this.callback(settings);
	},

	indentation: function(whitespaces) {
		var first = whitespaces[0];
		if (!Array.prototype.every.call(whitespaces, function(character) {
			return character === first;
		}))
			return null;
		return {
			character: first,
			count: Math.floor(whitespaces.length / this.indent)
		};
	},

	transform: function(input, settings) {
		Rule.prototype.transform.apply(this, arguments);
		if (!this.enforceRule) {
			return;
		}

		this.prevToken = null;
		this.oneIndent = (settings.indent_style === 'tab') ?
			'\t' :
			' '.repeat(settings.indent_size);

		input.on('data', this.onTransformData.bind(this));
		input.on('end', this.onTransformEnd.bind(this));
	},

	onTransformData: function(token) {

		var prevToken = this.prevToken;

		if (prevToken === null && this.isWhitespaces(token)) {
			token.value = '';
		}

		if (prevToken === null || this.hasNewline(prevToken)) {

			if (prevToken === null) {
				prevToken = this.prevToken = this.tokens.emptyString;
			}

			var indentLevel = 0;
			//var path;

			//token has a grammarToken and is not an unindented line comment (i.e. commented out code)
			if (token.grammarToken &&
				 !(this.isLineComment(token) && (prevToken.value === '' || this.endsWithNewline(prevToken)))) {
				indentLevel = token.grammarToken['Indentation'].level;
				//path = token.grammarToken[ 'Indentation' ].path;

				if (token.range[0] !== token.grammarToken.range[0] &&
				token.range[1] !== token.grammarToken.range[1] &&
				['(', ')', '.', 'else'].indexOf(token.value) === -1 ||
				this.postfixExpressions.indexOf(token.grammarToken['Indentation'].parent) !== -1) {
					indentLevel++;
					//path = path + '*';
				}
			}

			var lineCount = (prevToken && prevToken.value.match(/\r?\n/g) || []).length;
			//prevToken.value = this.EOL.repeat(lineCount) + this.oneIndent.repeat(indent) + '/*' + (indent) + '(' + path + ')*/ ';
			prevToken.value = this.EOL.repeat(lineCount) + this.oneIndent.repeat(indentLevel);
		}

		this.output.write(prevToken);
		this.prevToken = token;
	},

	onTransformEnd: function() {
		if (this.prevToken !== null) {
			this.output.write(this.prevToken);
		}
		this.output.end();
	}

});
