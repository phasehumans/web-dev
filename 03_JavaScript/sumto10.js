function sum (num) {
    let sum= 0
    for (let i= 0; i <= num; i++){
        sum = sum + i
    }

    return sum
}

console.log(sum(2))
console.log(sum(10))