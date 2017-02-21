var CodePainterObject = require('./lib/Object');
var MultiInferrer = require('./lib/MultiInferrer');
var Transformer = require('./lib/Transformer');
var util = require('./lib/util');


function CodePainter() {
	CodePainter.super_.apply(this, arguments);
}

util.inherits(CodePainter, CodePainterObject, {

	infer: function() {
		var multiInferrer = new MultiInferrer();
		multiInferrer.infer.apply(multiInferrer, arguments);
	},

	xform: function() {
		var transformer = new Transformer();
		transformer.transform.apply(transformer, arguments);
	},

	transform: function() {
		this.xform.apply(this, arguments);
	},

	Inferrer: MultiInferrer,

	Transformer: Transformer
});

module.exports = new CodePainter();
