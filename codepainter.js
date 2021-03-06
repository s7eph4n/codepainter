const fs = require('fs'),
      Pipe = require('./lib/Pipe'),
      rules = require('./lib/rules'),
      Serializer = require('./lib/Serializer'),
      Tokenizer = require('./lib/Tokenizer');

/**
 * Converts the style string into an object.
 * 
 * First tries to parse the style string as a JSON string. If that does not work,
 * tries interpret the style string as the name of a predefined style and load
 * the respective style file. If that does not work either, throws an error.
 * 
 */
function convertStyle ( style ) {
	
	if ( ( typeof style === 'string' ) ) {
		
		try {
			style = JSON.parse(style);
		} catch (e) {
			try {
				style = require ( __dirname + '/lib/styles/' + style + '.json' );
			} catch (e) {
			
				msg = style + ' is not a valid style.\n\nValid predefined styles are:\n';
			
				var files = fs.readdirSync( __dirname + '/lib/styles/' );
			
				for ( var i in files ) {
					msg += '  ' + files[i].slice(0, -5) + '\n';
				}
			
				throw new Error(msg);
			}
		}
	}

	return style;
}

module.exports.infer = function (sample, callback) {
    var style = {},
        tokenizer = new Tokenizer();

    sample.pipe(tokenizer);

    rules.forEach(function (rule) {
        rule.infer(tokenizer, function (value) {
            style[rule.name] = value;
        });
    });
	tokenizer.on('end',function(){
		callback(style);
	});
    sample.resume();
};

module.exports.transform = function (input, style, output) {
    var enabledRules = [],
        tokenizer = new Tokenizer(),
        serializer = new Serializer(),
        streams = [];

	style = convertStyle(style);

    rules.forEach(function (rule) {
        if (typeof style[rule.name] !== 'undefined' && style[rule.name] !== null)
            enabledRules.push(rule);
    });

    input.pipe(tokenizer);
    serializer.pipe(output);

    if (enabledRules.length > 0) {
		
		tokenizer.registerRules( enabledRules );
		
        streams.push(tokenizer);

        for (var i = 0; i < enabledRules.length - 1; i++)
            streams.push(new Pipe());
		
        streams.push(serializer);

        for (var i = 0; i < enabledRules.length; i++) {
            var rule = enabledRules[i];
            rule.transform(streams[i], style[rule.name], streams[i + 1], function (error) { });
        };
    } else {
        tokenizer.pipe(serializer);
    }

    input.resume();
};
