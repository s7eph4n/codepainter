var editorconfig = require('editorconfig');
var fs = require('fs');
var glob = require('glob');
var MemoryStream = require('memorystream');
var path = require('path');
var should = require('should');

var Pipe = require('../lib/Pipe');
var codepaint = require('../codepainter');
var rules = require('../lib/rules');


describe('Code Painter', function() {

	glob.sync('test/cases/*').forEach(function(testCase) {

		testCase = testCase.substr(testCase.lastIndexOf('/') + 1);

		describe(testCase + ' rule', function() {
			var Rule;
			for (var i = 0; i < rules.length; i++) {
				if (rules[i].prototype.name === testCase) {
					Rule = rules[i];
					break;
				}
			}

			glob.sync('test/cases/' + testCase + '/*/*.json').forEach(function(stylePath) {
				var setting = {
					folder: stylePath.substr(0, stylePath.lastIndexOf('/') + 1),
					styles: JSON.parse(fs.readFileSync(stylePath, 'utf-8'))
				};

				if (editorconfig.parse(stylePath).test !== true) {
					return;
				}

				testInferrance(Rule, setting);
				testTransformation(setting);
			});
		});
	});
});

function testInferrance(Rule, setting) {
	Object.keys(setting.styles).forEach(function(styleKey) {
		var styleValue = setting.styles[styleKey];
		var samplePath = verifyPath(setting.folder + 'sample.js');
		if (fs.existsSync(samplePath)) {
			it('infers ' + styleKey + ' setting as ' + styleValue, function(done) {
				codepaint.infer(samplePath, function(inferredStyle) {
					styleValue.should.equal(inferredStyle[styleKey]);
					done();
				}, Rule);
			});
		}
	});
}

function verifyPath(path) {
	fs.existsSync(path).should.be.true;
	return path;
}

function testTransformation(setting) {
	var folders = setting.folder.split('/');
	setting.name = folders[folders.length - 2];
	it('formats ' + setting.name + ' setting properly', function(done) {
		var inputPath = setting.folder + 'input.js';
		var expectedPath = verifyPath(setting.folder + 'expected.js');

		var outputStream = new MemoryStream();
		var output = '';
		outputStream.on('data', function(chunk) {
			output += chunk;
		});

		var options = {
			style: setting.styles,
			output: outputStream
		};

		codepaint.xform(inputPath, options, function() {
			var expected = fs.readFileSync(expectedPath, 'utf8');
			output.should.equal(expected);
			done();
		});
	});
}
