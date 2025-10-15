function greet (name){
    return `hello ${name}, Good Morning`
}

function printGreet (name){
    console.log(`Hello ${name}`)
}

let a= greet()
console.log(a)


printGreet()


console.log(greet("chaitanya"))

printGreet("chetan")

console.log(printGreet("chaitanya"))
// when you console a fn which return type is console its prints undefined at the end

printGreet("chetan")