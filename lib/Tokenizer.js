var assert = require('assert');
var Stream = require('stream').Stream;
var util = require('util');
var esprima = require('esprima');
var os = require('os');


Tokenizer = function() {
	this.contents = '';
	this.writable = true;
	this.readable = true;
	this.rules = [];
};

util.inherits(Tokenizer, Stream);

Tokenizer.prototype.registerRules = function(rules) {
	this.rules = rules;
};

Tokenizer.prototype.write = function(string) {
	this.contents += string;
};

Tokenizer.prototype.end = function() {
	try {
		var parsed = esprima.parse(this.contents, {
			comment: true,
			range: true,
			tokens: true,
			loc: true,
			tolerant: true
		});
	} catch(err) {
		err.message = [
			'Unable to parse JavaScript with Esprima.',
			err.message + '.',
			'Are you trying to parse ES6 Harmony code? Use CodePainter\'s harmony branch.'
		].join(os.EOL);
		this.emit('error', err);
		return;
	}

	this.rules.forEach(function(rule) {
		if (typeof rule.prepare === 'function') {
			rule.prepare(parsed, this.contents);
		}
	}.bind(this));

	var c = 0,
	body = parsed.body,
	comments = parsed.comments,
	t = 0,
	tokens = parsed.tokens,
	end = this.contents.length,
	pos = 0;

	/**
	 * Recursively walks the parser tree to find the grammar element for a given
	 * syntax token
	 */
	function findGrammarToken(syntaxToken, tree) {
		var elem;

		for (var key in tree) {

			var tk = tree[key];

			if (!(tk instanceof Object) || (key === 'range')) {
				continue;
			}

			var tkr = tk['range'];

			if (tkr === undefined) {
				elem = findGrammarToken(syntaxToken, tk);
				if (elem === null) {
					continue;
				}
				return elem;
			}

			var str = syntaxToken['range'];

			// tree element has a range
			if (str[0] >= tkr[0] && str[1] <= tkr[1]) {// token is within range of tree element
				elem = findGrammarToken(syntaxToken, tk);
				return (elem === null) ? tk : elem;
			}

		}
		return null;
	}

	function tokensLeft() {
		return pos < end;
	}

	function nextToken() {
		var comment = c < comments.length ? comments[c] : null,
		commentPos = comment ? comment.range[0] : end,
		token = t < tokens.length ? tokens[t] : null,
		tokenPos = token ? token.range[0] : end,
		nextPos = Math.min(commentPos, tokenPos),
		outToken;

		assert(pos <= nextPos);
		// There are whitespaces between the previous and the next token.
		// FIXME: It would be cool to detach whitespaces from the stream but still make it super
		// easy for the pipeline to ask for the whitespaces that follow or precede a specific token.
		if (pos < nextPos) {
			var whitespaces = this.contents.substring(pos, nextPos);
			outToken = {
				type: 'Whitespaces',
				value: whitespaces,
				range: [pos, nextPos]
			};
			pos = nextPos;
		} else if (commentPos < tokenPos) {
			c++;
			pos = comment.range[1];
			var commentType = comment.type === 'Line' ? 'LineComment' : 'BlockComment';
			outToken = {
				type: commentType,
				value: comment.value,
				range: comment.range
			};
		} else {
			t++;
			pos = token.range[1];
			outToken = {
				type: token.type,
				value: token.value,
				range: token.range
			};
		}

		outToken.grammarToken = findGrammarToken(outToken, body);

		return outToken;
	}

	while (tokensLeft()) {
		var token = nextToken.call(this);
		this.emit('data', token);
	}
	this.emit('end');
};

module.exports = Tokenizer;
