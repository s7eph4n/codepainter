var async = require('async');
var editorconfig = require('editorconfig');
var extend = require('node.extend');
var fs = require('fs');
var glob = require('glob');
var mkdirp = require('mkdirp');
var MemoryStream = require('memorystream');
var path = require('path');
var stream = require('stream');
var util = require('util');

var codepainter = require('../codepainter');
var CodePainterObject = require('./Object');
var EndOfLineRule = require('./rules/end_of_line');
var Inferrer = require('./Inferrer');
var rules = require('./rules');
var Serializer = require('./Serializer');
var Tokenizer = require('./Tokenizer');
var util = require('./util');


function Transformer() {
	Transformer.super_.apply(this, arguments);
}

module.exports = util.inherits(Transformer, CodePainterObject, {

	transform: function(globs, options, callback) {

		if (typeof options === 'function') {
			callback = options;
			options = undefined;
		}

		this.globs = globs;
		this.options = options || {};
		this.callback = callback;

		this.transformed = 0;
		this.skipped = 0;
		this.errored = 0;
		this.style = {};

		if (options && options.infer) {
			this.infer(this.cascadeAndTransform.bind(this));
			return;
		}

		this.cascadeAndTransform();
	},

	infer: function(callback) {
		codepainter.infer(this.options.infer, function(inferredStyle) {
			this.emit('cascade', this.style, inferredStyle, 'Inferred style');
			this.style = inferredStyle;
			callback();
		}.bind(this));
	},

	cascadeAndTransform: function() {
		this.cascadeStyles(function() {
			var globs = this.globs;
			if (typeof globs === 'string') {
				this.inputs = [globs];
				this.transformPath(globs);
			} else if (globs && globs instanceof stream.Readable) {
				this.transformStream(globs);
			} else if (globs && globs[0] instanceof stream.Readable) {
				this.transformStream(globs[0]);
			} else {
				util.reduceGlobs(globs, this.onGlobPaths.bind(this));
			}
		}.bind(this));
	},

	cascadeStyles: function(cb) {
		var style = this.style;
		var options = this.options;

		cascadePredef.call(this);

		function cascadePredef() {
			if (!options.predef) {
				cascadeJson.call(this);
				return;
			}
			fs.readFile(__dirname + '/styles/' + options.predef + '.json', 'utf8', function(err, data) {
				if (err) {
					this.err = err;
					return;
				}
				data = JSON.parse(data);
				this.emit('cascade', style, data, options.predef + ' style');
				style = extend(style, data);
				cascadeJson.call(this);
			}.bind(this));
		}

		function cascadeJson() {
			if (!options.json) {
				cascadeInline.call(this);
				return;
			}
			fs.readFile(path.resolve(options.json), 'utf8', function(err, data) {
				if (err) {
					this.err = err;
					return;
				}
				data = JSON.parse(data);
				this.emit('cascade', style, data, 'Supplied JSON file');
				style = extend(style, data);
				cascadeInline.call(this);
			}.bind(this));
		}

		function cascadeInline() {
			if (options.style && Object.keys(options.style).length) {
				this.emit('cascade', style, options.style, 'Inline styles');
				style = extend(style, options.style);
			}
			cascadeEditorConfig.call(this);
		}

		function cascadeEditorConfig() {
			if (options.editorConfig) {
				this.emit('cascade', style, {
					editor_config: true
				}, 'Editor Config (applied on a file-by-file basis)');
			}
			applyStyle.call(this);
		}

		function applyStyle() {
			this.style = style;
			cb();
		}

	},

	transformPath: function(inputPath, outputPath) {
		var style = this.cascadeEditorConfigStyle(inputPath);
		var rules = this.getRules(style);

		if (!rules.length || style.codepaint === false) {
			this.skip(inputPath);
			return;
		}

		var inputStream = this.createInputStream(inputPath);
		if (typeof this.options.output === 'string') {
			outputPath = this.options.output;
		}
		var output = outputPath ? MemoryStream.createWriteStream() :
			this.options.output || process.stdout;
		var streams = this.createStreams(inputStream, rules, output);

		new Inferrer().infer(inputPath, function(inferredStyle) {
			this.EOL = this.getEOLChar(inferredStyle['end_of_line']);
			this.applyRules(rules, streams, style);
			inputStream.resume();
		}.bind(this), EndOfLineRule);

		inputStream.on('end', this.writeOutput.bind(this, outputPath, output));
	},

	getEOLChar: function(setting) {
		switch (setting) {
			case 'crlf':
				return '\r\n';
			case 'lf':
				return '\n';
			default:
				return os.EOL;
		}
	},

	writeOutput: function(outputPath, output) {
		if (!outputPath) {
			this.onClose();
			return;
		}
		mkdirp(path.dirname(outputPath), function(err) {
			if (err) {
				this.err = err;
				this.onClose();
				return;
			}
			fs.writeFile(outputPath, output.toString(), this.onClose.bind(this));
		}.bind(this));
	},

	onClose: function() {
		this.closed = this.closed || 0;
		if (++this.closed !== ++this.transformed + this.errored) {
			console.log('returning');
			return;
		}
		this.emit('end', this.err, this.transformed, this.skipped, this.errored);
		if (typeof this.callback === 'function') {
			this.callback(this.err, this.transformed, this.skipped, this.errored);
		}
	},

	transformStream: function(inputStream) {
		inputStream.setEncoding('utf8');
		var rules = this.getRules(this.style);
		if (!rules.length) {
			inputStream.on('data', function(chunk) {
				process.stdout.write(chunk);
			});
		}

		var data = '';
		inputStream.on('data', function(chunk) {
			data += chunk;
		});

		new EndOfLineRule().infer(inputStream, function(inferredStyle) {
			this.EOL = this.getEOLChar(inferredStyle['end_of_line']);
			var memoryStream = MemoryStream.createReadStream(data);
			var streams = this.createStreams(memoryStream, rules);
			this.applyRules(rules, streams, this.style);
		}.bind(this));
	},

	onGlobPaths: function(paths) {
		this.inputs = paths;
		paths.forEach(function(path) {
			if (fs.statSync(path).isFile()) {
				this.transformPath(path, path);
			}
		}.bind(this));
	},

	skip: function(inputPath) {
		this.emit('skip', ++this.skipped, inputPath);
		this.inputEnd();
	},

	cascadeEditorConfigStyle: function(inputPath) {
		var style = extend({}, this.style);
		if (this.options.editorConfig) {
			var editorConfigStyle = editorconfig.parse(inputPath);
			style = extend(style, editorConfigStyle);
		}
		return style;
	},

	getRules: function(style) {
		var rulesToApply = [];
		rules.forEach(function(Rule) {
			var supportedSettings = Rule.prototype.supportedSettings;
			var keys = Object.keys(supportedSettings);
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				if (key in style) {
					rulesToApply.push(new Rule());
					break;
				}
			}
		}.bind(this));
		return rulesToApply;
	},

	createInputStream: function(inputPath) {
		var stream = fs.createReadStream(inputPath);
		stream.pause();
		stream.setEncoding('utf8');
		return stream;
	},

	createStreams: function(input, rules, outputStream) {
		var tokenizer = new Tokenizer();
		input.pipe(tokenizer);

		var inputPath = input.path || path.resolve('.');
		var output = outputStream || process.stdout;

		tokenizer.on('error', function(err) {
			this.onError.call(this, err, inputPath);
		}.bind(this));

		var serializer = new Serializer();
		serializer.pipe(output);

		output.on('end', this.onTransformEnd.bind(this, inputPath));

		tokenizer.registerRules(rules);

		var streams = [tokenizer];
		for (var i = 0; i < rules.length - 1; i++)
			streams.push(new Pipe());

		streams.push(serializer);
		return streams;
	},

	applyRules: function(rules, streams, style) {
		rules.forEach(function(rule, i) {
			rule.EOL = this.EOL;
			rule.transform(streams[i], style, streams[i + 1], onError);
		}.bind(this));
		function onError() {}
	},

	onTransformEnd: function(inputPath) {
		this.emit('transform', ++this.transformed, inputPath);
		this.inputEnd();
	},

	inputEnd: function(err) {
		this.processed = this.transformed + this.skipped + this.errored;
		if (this.processed !== this.inputs.length) {
			return;
		}
		this.err = this.firstError || err;
	},

	onError: function(err, inputPath) {
		this.emit('error', err, inputPath);
		if (!this.firstError) {
			this.firstError = err;
		}
		this.errored++;
		this.inputEnd.call(this, err);
	}

});
