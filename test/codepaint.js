var fs = require('fs');
var path = require('path');
var should = require('should');

var codepaint = require('../codepainter');


describe('codepaint command', function() {

	describe('infer sub-command', function() {

		it('infers formatting style from a sample file', function (done) {
			var sample = path.resolve('test/inputs/sample.js');
			var rs = fs.createReadStream(sample);
			codepaint.infer(rs, function (style) {
				style.should.not.be.undefined;
				done();
			});
		});

		it('supports a ReadableStream as input', function(done) {
			var sample = path.resolve('test/inputs/sample.js');
			codepaint.infer(fs.createReadStream(sample), function (style) {
				style.should.not.be.undefined;
				done();
			});
		});
	});

	describe('transform sub-command', function() {

		it('transforms an input file to an output file', function (done) {
			var input = path.resolve('test/inputs/input.js');
			var options = {
				style: {
					indent_style: 'tab'
				},
				output: path.resolve('tmp/out.js')
			};
			codepaint.xform(input, options, function (err, xformed, skipped, errored) {
				should.not.exist(err);
				xformed.should.equal(1);
				skipped.should.equal(0);
				errored.should.equal(0);
				fs.unlink(options.output, function () {
					done();
				});
			});
		});
	});

	
});
