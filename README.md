# Code Painter

[![Build Status][]](http://travis-ci.org/jedmao/codepainter)
[![Dependency Status][]](https://gemnasium.com/jedmao/codepainter)
[![NPM version](https://badge.fury.io/js/codepainter.svg)](http://badge.fury.io/js/codepainter)
[![Views](https://sourcegraph.com/api/repos/github.com/jedmao/codepainter/counters/views-24h.png)](https://sourcegraph.com/github.com/jedmao/codepainter)

[![NPM](https://nodei.co/npm/codepainter.png?downloads=true)](https://nodei.co/npm/codepainter/)

Code Painter is a JavaScript beautifier that can transform JavaScript files
into the formatting style of your choice. Style settings can be supplied via
predefined styles, a custom JSON file, command line settings, [EditorConfig][]
settings or it can even be inferred from one or more sample files. For example,
you could provide a code snippet from the same project with which the new code
is intended to integrate.

It uses the excellent [Esprima parser][] by [Ariya Hidayat][] and his
[contributors][] — thanks!

The name is inspired by Word's Format Painter, which does a similar job for
rich text.


## Requirements

Code Painter requires [Node.js][] version 0.10.6 or above.


## Installation

    $ npm install codepainter

To access the command globally, do a global install:

    $ npm install -g codepainter

*nix users might also have to add the following to their .bashrc file:

    PATH=$PATH:/usr/local/share/npm/bin


## CLI Usage

You can see the usage in the CLI directly by typing `codepaint` or
`codepaint --help`.

```
$ codepaint --help

  Code Painter beautifies JavaScript.

  Usage: codepaint [options] <command>

  Commands:

    infer [options] <globs>...  Infer formatting style from file(s)
    xform [options] <globs>...  Transform file(s) to specified style

  Options:

    -h, --help     output help information
    -V, --version  output version information


$ codepaint infer --help

  Infer formatting style from file(s)

  Usage: infer [options] <globs>...

  Options:

    -h, --help     output help information
    -d, --details  give a detailed report with trend scores
    --ini          use ini file format

  Examples:

    $ codepaint infer "**/*.js"
    $ codepaint infer "**/*view.js" "**/*model.js"
    $ codepaint infer -d "**/*.js"
    $ codepaint infer --ini "**/*.js"


$ codepaint xform --help

  Transform file(s) to specified formatting style

  Usage: xform [options] <globs>...

  Options:

    -h, --help                 output help information
    -i, --infer <glob>         code sample(s) to infer
    -p, --predef <name>        cascade predefined style (e.g., idiomatic)
    -j, --json <path>          cascade JSON style over predef style
    -s, --style <key>=<value>  cascade explicit style over JSON
    -e, --editor-config        cascade EditorConfig style over all others

  Examples:

    $ codepaint xform "**/*.js"
    $ codepaint xform "**/*view.js" "**/*model.js"
    $ codepaint xform %s "**/*.js" -i sample.js
    $ codepaint xform %s "**/*.js" -p idiomatic
    $ codepaint xform %s "**/*.js" -j custom.json
    $ codepaint xform %s "**/*.js" -s quote_type=null
    $ codepaint xform %s "**/*.js" -s indent_style=space -s indent_size=4
    $ codepaint xform %s "**/*.js" -e
```


## Library Usage

```js
var codepaint = require('codepainter');
```

Library usage is intended to be every bit the same as CLI usage, so you can
expect the same options and arguments that the CLI requires.

### .infer(< path|glob|globs|ReadableStream >[,options][,callback])

Example usage:

```js
codepaint.infer('**/**.js', {details: true}, function(inferredStyle) {
    console.log(inferredStyle);
});
```

### .xform(< path|glob|globs|ReadableStream >[,options][,callback])

Example usage:

```js
codepaint.xform('input.js', {indent_size: 4}, function(err, xformed, skipped, errored){
    if (err) {
        throw err;
    }
    console.log('transformed:', xformed);
    console.log('skipped:', skipped);
    console.log('errored:', errored);
});
```

The following example infers formatting style from `sample.js` and uses that
inferred style to transform all .js files under the current directory.

```js
codepaint.infer('sample.js', function(inferredStyle) {
    codepainter.xform('**/**.js', {style: inferredStyle});
});
```

'sample.js' could also be an array or any readable stream. `transform` is an
alias for the `xform` method. You can use either one.

Great, so that's all nice and simple, but maybe you want to do something with
the output. We start by creating an instance of the Transformer class.

```js
var Transformer = require('codepainter').Transformer;
var transformer = new Transformer();
```

Now, we can listen to any of the following events:

### cascade

Every time one style cascades over another.

```js
transformer.on('cascade', cascade);
function cascade(styleBefore, styleToMerge, styleType) {
    // code here
}
```

### transform

Every time a file is transformed.

```js
transformer.on('transform', function(transformed, path) {
    // code here
}
```

### error

```js
transformer.on('error', function(err, inputPath) {
    // code here
}
```

### end

When all transformations have taken place.

```js
transformer.on('end', function(err, transformed, skipped, errored) {
    // code here
}
```

Of course, none of these events will fire if you don't perform the transform:

`transformer.transform(globs, options);`


## CLI Examples

    $ codepaint infer "**/*.js"

Infers formatting style from all .js files under the current directory into a
single JSON object, which you can pipe out to another file if you want. It can
then be used in a transformation (below).

If you want to create an `.editorconfig` file, use the `--ini` flag:

    $ codepaint infer --ini "**/*.js" > .editorconfig

Moving on to the `xform` sub-command:

    $ codepaint xform "**/*.js"

This doesn't transform any files, but it does show you how many files would be
affected by the glob you've provided. Globs absolutely *must* be in quotes or
you will experience unexpected behavior!

    $ codepaint xform -i infer.js "**/*.js"

Transforms all .js files under the current directory with the formatting style
inferred from infer.js

    $ codepaint xform -p idiomatic "**/*.js"

Transforms all .js files under the current directory with a Code Painter
pre-defined style. In this case, Idiomatic. The only other pre-defined styles
available at this time are mediawiki and hautelook.

    $ codepaint xform -j custom.json "**/*.js"

Transforms all .js files under the current directory with a custom style in
JSON format.

    $ codepaint xform -s indent_style=space -s indent_size=4 "**/*.js"

Transforms all .js files under the current directory with 2 settings:
`indent_style=space` and `indent_size=4`. You can specify as many settings as
you want and you can set values to `null` to disable them.

    $ codepaint xform -e "**/*.js"

Transforms all .js files under the current directory with the EditorConfig
settings defined for each individual file.

Refer to [EditorConfig Core Installation][] for installation instructions and
[EditorConfig][] for more information, including how to define and use
`.editorconfig` files.

    $ codepaint xform -i infer.js -p idiomatic -j custom.json
    -s end_of_line=null -e  "**/*.js"

As you can see, you can use as many options as you want. Code Painter will
cascade your styles and report how the cascade has been performed, like so:

```
  Inferred style:
   + indent_style = tab
   + insert_final_newline = true
   + quote_type = auto
   + space_after_anonymous_functions = false
   + space_after_control_statements = false
   + spaces_around_operators = false
   + trim_trailing_whitespace = false
   + spaces_in_brackets = false

  hautelook style:
   * indent_style = space
   + indent_size = 4
   * trim_trailing_whitespace = true
   + end_of_line = lf
   = insert_final_newline = true
   = quote_type = auto
   * spaces_around_operators = true
   = space_after_control_statements = true
   = space_after_anonymous_functions = false
   * spaces_in_brackets = false

  Supplied JSON file:
   * space_after_control_statements = true
   = indent_style = space
   * indent_size = 3

  Inline styles:
   x end_of_line = null

  Editor Config:
   + applied on a file-by-file basis

  ...........................

  REPORT: 27 files transformed
```


## Supported Style Properties

### **codepaint**: *false*

Tells CodePainter to skip the file (no formatting). This property really
only makes sense if you are using the `--editor-config` CLI option. This
allows you to, for example, skip a vendor scripts directory.

### EditorConfig properties
**indent_style**, **indent_size**, **end_of_line**,
**trim_trailing_whitespace** and **insert_final_newline**.

Refer to [EditorConfig's documentation][] for more information.

### **quote_type**: *single*, *double*, *auto*

Specifies what kind of quoting you would like to use for string literals:

```js
console.log("Hello world!"); // becomes console.log('Hello world!');
```

 Adds proper escaping when necessary, obviously.

```js
console.log('Foo "Bar" Baz'); // becomes console.log("Foo \"Bar\" Baz");
```

The *auto* setting infers the quoting with a precedence toward *single*
mode.

```js
console.log("Foo \"Bar\" Baz"); // becomes console.log('Foo "Bar" Baz');
console.log('Foo \'Bar\' Baz'); // becomes console.log("Foo 'Bar' Baz");
```

###  **space_after_control_statements**: *true*, *false*

Specifies whether or not there should be a space between if/for/while and
the following open paren:

If true:

```js
if(x === 4) {} // becomes if (x === 4) {}
```

If false:

```js
while (foo()) {} // becomes while(foo()) {}
```

### **space_after_anonymous_functions**: *true*, *false*

Specifies whether or not there should be a space between the `function`
keyword and the following parens in anonymous functions:

```js
function(x) {} // becomes function (x) {}
```

### **spaces_around_operators**: *true*, *false*, *hybrid*

Specifies whether or not there should be spaces around operators such as
`+,=,+=,>=,!==`.

```js
x = 4; // becomes x=4;
a>=b; // becomes a >= b;
a>>2; // becomes a >> 2;
```

Unary operators `!,~,+,-` are an exception to the rule; thus, no spaces
are added. Also, any non-conditional `:` operators do not receive a space
(i.e., the switch...case operator and property identifiers):

```js
switch (someVar) {
    case 'foo' : // becomes case 'foo':
        var x = {foo : 'bar'}; // becomes {foo: 'bar'}
        break;
}
```

*Hybrid* mode is mostly like the *true* setting, except it behaves as
*false* on operators `*,/,%`:

```js
var x = 4 * 2 + 1 / 7; // becomes var x = 4*2 + 1/7;
```

###  **spaces_in_brackets**: *true*, *false*, *hybrid*

Specifies whether or not there should be spaces inside brackets, which
includes `(),[],{}`. Empty pairs of brackets will always be shortened.

If true:

```js
if (x === 4) {} // becomes if ( x === 4 ) {}
```

If false:

```js
if ( x === 4 ) {} // becomes if (x === 4)
```

The *hybrid* setting mostly reflects Idiomatic style. Refer to
[Idiomatic Style Manifesto][].


## Pipes and Redirects

On a unix command-line, you can transform a file from the stdin stream:

    $ codepaint xform -s indent_size=2 < input.js

The stdout stream works a bit differently. Since Code Painter can transform
multiple files via glob syntax, it wouldn't make sense to output the
transformations of all those files to a single stream. Instead, only if you
are using stdin as input and no `-o, --output` option is provided will Code
Painter send the transformation to the stdout stream:

    $ codepaint xform -s indent_size=2 < input.js > output.js

Piping is supported as well:

    $ codepaint xform -s indent_size=2 < input.js | othercommand`


## Git Clean and Smudge Filters

Because Code Painter supports stdin and stdout streams, as explained above,
Git "clean" and "smudge" filters can be used as well.

**CAUTION:** My personal experience has shown inconsistent results, so use with
caution! Also, please contact me if you figure out how to do this without any
hiccups.

First, change your `.gitattributes` file to use your new filter. We'll call it
"codepaint".

    *.js   filter=codepaint

Then, tell Git what the "codepaint" filter does. First, we will convert code
to tabs upon checkout with the "smudge" filter:

    $ git config filter.codepaint.smudge "codepaint xform -s indent_style=tab"

Then, upon staging of files with the Git "clean" filter, the style is restored
to spaces and cleaned to reflect any other style preferences you may have set:

    $ git config filter.codepaint.clean "codepaint xform -p style.json"

This allows you to work in the indentation of your preference without stepping
on anyone's toes and checking in inconsistent indentation. Or maybe you have
your own preference for spaces around operators? Smudge it to your preference
and clean it to your company's formatting style.

**WARNING:** Git "clean" and "smudge" filters are bypassed with GitHub for
Windows.

Refer to [Git's documentation][] for more information on Git "smudge" and
"clean" filters.


## Recommended Use

It is highly recommended that you use the EditorConfig approach to painting
your code. To do so, do the following:

Place an `.editorconfig` file at your project root. Refer to this
project's [.editorconfig][] file for a point of reference as to how this
might look. You can also scatter `.editorconfig` files elsewhere
throughout your project to prevent Code Painter from doing any
transformations (e.g., your vendor scripts folders). In this case, the
`.editorconfig` file would simply read: `codepaint = false`.

Specify Code Painter in your devDependencies section of your package.json:

```json
{
    "devDependencies": {
        "codepainter": "~0.3.15"
    }
}
```

Define a `codepaint` script in the scripts section of your package.json:

```json
{
    "scripts": {
        "codepaint": "node node_modules/codepainter/bin/codepaint xform -e **/**.js"
    }
}
```

If you have Code Painter installed globally, the command is as simple as:

```json
{
    "scripts": {
        "codepaint": "codepaint xform -e **/**.js"
    }
}
```

But Code Painter wouldn't install globally by default, so the first
approach is the recommended one. Then, you can run Code Painter on your
entire project, consistently, with the following command:

    $ npm run-script codepaint

You *could* run `codepaint` manually every time you want to do it, but you
might find this next `.bashrc` shortcut more useful. The idea is to run
this `gc` alias to a newly-defined `codepaint_git_commit` function. This,
you do instead of running `git commit`. The caveat is that you need to
stage your changes with `git add` before doing so. This is because the
command runs `codepaint` only on staged `.js` files. Aside from this
caveat, you can commit things mostly the same as you were used to before.
Now, `gc` can paint your code before a commit and bail-out of the commit
if there are issues with the process (e.g., JavaScript parse errors). The
idea of formatting code before a commit is definitely controversial, but
if you choose to do so anyway, here's the neat trick to put in your
`.bashrc` file:

```bash
# Example usage: gc "initial commit"
alias gc=codepaint_git_commit
codepaint_git_commit() {
    # 1. Gets a list of .js files in git staging and sends the list to CodePainter.
    # 2. CodePainter with the -e flag applies rules defined in your EditorConfig file(s).
    # 3. After CodePainter is done, your args are passed to the `git commit` command.
    jsfiles=$(git diff --name-only --cached | egrep '\.js$')
    if [ $jsfiles ]; then
        ./node_modules/codepainter/bin/codepaint xform -e $jsfiles
    fi
    git commit -m "$@"
}
```

You could also compare Code Painter's output with the original file on a Git
pre-commit hook and reject the commit if the files don't match. Let's be real
though. This would happen almost *every* time you commit and it would be a
royal pain in your workflow.

There are so many ways you could use Code Painter. How do you prefer to use
Code Painter? Feel free to contact me, Jed, with tips or suggestions. See
[package.json][] for contact information).


## Enforcing

Code Painter can be used to enforce a formatting style in a number of creative
ways. To fail [Travis CI][] if code does not comply with your organization's
style guide, the process would work something like this:

1. Run Code Painter on the code base.
1. Fail Travis if any file changes are detected. This encourages developers
to run Code Painter before pushing code.

Running Code Painter with Travis is as simple as adding the command to the
`before_script` section of your `.travis.yml` file:
```yaml
before_script:
  - node node_modules/codepainter/bin/codepaint xform -e "**/**.js"
```

Notice I didn't use the command `npm run-script codepaint`. This is because
there were issues with the double-quoted glob being processed. If you find a
way around this, please let me know.

Next, you need to create a node script that exits the node process with a
non-zero code if any changes are detected. This, we do with `git diff`:
```js
var clc = require('cli-color');
var spawn = require('child_process').spawn;
var git = spawn('git', ['diff', '--name-only']);

git.stdout.setEncoding('utf8');
git.stdout.on('data', exitWithErrorIfFilesHaveChanged);

function exitWithErrorIfFilesHaveChanged(data) {
    console.log();
    console.log(clc.red('Error: The following files do not conform to the CompanyX style guide:'));
    console.log(data);
    process.exit(1);
}
```

Finally, you can add this script to your `.travis.yml` file in the `script`
section:
```yaml
script:
  - node gitdiff.js
```

Violä! Travis should now fail if code does not comply with your organization's
style guide.


## License

Released under the MIT license.

[Build Status]: https://secure.travis-ci.org/jedmao/codepainter.svg?branch=master
[Dependency Status]: https://gemnasium.com/jedmao/codepainter.svg
[Esprima parser]: http://esprima.org/
[Ariya Hidayat]: http://ariya.ofilabs.com/
[contributors]: https://github.com/ariya/esprima/graphs/contributors
[Node.js]: http://nodejs.org/
[EditorConfig]: http://editorconfig.org/
[EditorConfig's documentation]: http://editorconfig.org/
[EditorConfig Core Installation]: /editorconfig/editorconfig-core#installation
[Idiomatic Style Manifesto]: /rwldrn/idiomatic.js/#whitespace
[.editorconfig]: .editorconfig
[package.json]: package.json
[Git's documentation]: http://git-scm.com/book/ch7-2.html
[Travis CI]: https://travis-ci.org/


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/jedmao/codepainter/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

