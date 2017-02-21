var fs = require('fs');
var extend = require('node.extend');
var stream = require('stream');

var CodePainterError = require('./Error');
var CodePainterObject = require('./Object');
var Pipe = require('./Pipe');
var rules = require('./rules');
var Tokenizer = require('./Tokenizer');
var util = require('./util');


function Inferrer() {
	Inferrer.super_.apply(this, arguments);
}

module.exports = util.inherits(Inferrer, CodePainterObject, {

	name: 'Inferrer',

	infer: function(input, callback, Rule) {
		this.openInput(input);
		this.initTokenizer();
		this.inferRules(Rule);
		this.initTokenizerEnd(callback);
	},

	openInput: function(input) {
		var inputStream = (input instanceof stream.Readable) ?
			input :
			fs.createReadStream(input);
		inputStream.setEncoding('utf8');
		this.inputStream = inputStream;
	},

	initTokenizer: function() {
		var tokenizer = new Tokenizer();
		tokenizer.on('error', function(err) {
			this.error(err.message);
		}.bind(this));
		this.tokenizer = tokenizer;
		this.inputStream.pipe(this.tokenizer);
	},

	inferRules: function(Rule) {
		if (typeof Rule !== 'undefined') {
			this.inferRule(Rule);
		} else {
			rules.forEach(this.inferRule.bind(this));
		}
	},

	inferRule: function(Rule) {
		new Rule().infer(this.tokenizer, onInferEnd.bind(this));
		function onInferEnd(inferredStyle) {
			this.style = extend(this.style, inferredStyle);
		}
	},

	initTokenizerEnd: function(callback) {
		this.tokenizer.on('end', function() {
			callback(this.style);
		}.bind(this));
	}

});
