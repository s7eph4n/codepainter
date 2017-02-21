if (!String.prototype.repeat) {
	String.prototype.repeat = function(count) {
		return count > 0 ? new Array(count + 1).join(this) : '';
	};
}

if (!String.prototype.reverse) {
	String.prototype.reverse = function() {
		return this.split('').reverse().join('');
	};
}
