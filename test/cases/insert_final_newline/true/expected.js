var i;
var fib = [];

fib[0] = 0;
fib[1] = 1;
for(i=2; i<=10; i++)
{
    // Next fibonacci number = previous + one before previous
    fib[i] = fib[i-2] + fib[i-1];
    alert(fib[i]);
}   
