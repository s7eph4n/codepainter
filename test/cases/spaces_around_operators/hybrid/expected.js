var x, y,
    a = x++ + --y,
    b = !x && ~y || x*y & x/y | x%y | +x | -y,
    c = x + y || x - y,
    d = x << y & x >> y | x >>> y,
    e = x < y || x <= y && x > y || x >= y,
    f = x == y != x === y !== y,
    g = x & y ^ x | y && x || y ? x : y;

x = y;
x += y;
x -= y;
x *= y;
x /= y;
x %= y;
x <<= y;
x >>= y;
x >>>= y;
x &= y;
x ^= y;
x |= y;
x = !!y;
x = ~y;

switch(true) {
    case 'foo':
        break;
    case true:
        break;
    default:
        break;
}

var x = {
    foo: 'bar',
    'baz': 'qux'
};
