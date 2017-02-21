var util = require('./util');

function CodePainterError(message) {
	CodePainterError.super_.call(this);
	this.message = message || '';
}

module.exports = util.inherits(CodePainterError, Error, {
	name: 'CodePainterError'
});
