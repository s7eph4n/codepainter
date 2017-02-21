// 2.A.1.1
if ( condition ) {
  // statements
}

while ( condition ) {
  // statements
}

for ( var i = 0; i < 100; i++ ) {
  // statements
}

var prop;

for ( prop in object ) {
  // statements
}

if ( true ) {
  // statements
} else {
  // statements
}

// 2.B.2.1
// Named Function Declaration
function foo( arg1, argN ) {

}

// Usage
foo( arg1, argN );

// 2.B.2.2
// Named Function Declaration
function square( number ) {
  return number * number;
}

// Usage
square( 10 );

// Really contrived continuation passing style
function square( number, callback ) {
  callback( number * number );
}

square( 10, function( square ) {
  // callback statements
} );

// 2.B.2.3
// Function Expression
var square = function( number ) {
  // Return something valuable and relevant
  return number * number;
};

// Function Expression with Identifier
// This preferred form has the added value of being
// able to call itself and have an identity in stack traces:
var factorial = function factorial( number ) {
  if ( number < 2 ) {
    return 1;
  }

  return number * factorial( number - 1 );
};

// 2.B.2.4
// Constructor Declaration
function FooBar( options ) {

  this.options = options;
}

// Usage
var fooBar = new FooBar( { a: "alpha" } );

fooBar.options;
// { a: "alpha" }

// 2.C.1.1
// Functions with callbacks
foo( function( ) {
  // Note there is no extra space between the first paren
  // of the executing function call and the word "function"
} );

// Function accepting an array, no space
foo( [ "alpha", "beta" ] );

// 2.C.1.2
// Function accepting an object, no space
foo( {
  a: "alpha",
  b: "beta"
} );

// Single argument string literal, no space
foo( "bar" );

// Inner grouping parens, no space
if ( !( "foo" in obj ) ) {

}
