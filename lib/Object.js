var EventEmitter = require('events').EventEmitter;

var CodePainterError = require('./Error');
var util = require('./util');


function CodePainterObject(onError) {
	CodePainterObject.super_.call(this);
	this.onError = onError || this.onError;

	CodePainterObjectError.prototype.name = this.name + 'Error';
	function CodePainterObjectError(message) {
		CodePainterObjectError.super_.call(this, message);
	}

	util.inherits(CodePainterObjectError, CodePainterError);
	this.Error = CodePainterObjectError;
}

module.exports = util.inherits(CodePainterObject, EventEmitter, {

	error: function(message) {
		this.onError(new this.Error(message));
	},

	onError: function(err) {
		this.emit('error', err);
	}

});
