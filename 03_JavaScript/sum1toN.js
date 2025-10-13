// sync code execution

function sum (n){
    let res= 0
    for (let i= 0; i <= n; i++){
        res+= i
    }

    return res
}

function sumadv(n){
    let res= n * (n - 1)
    return res
}

let ans= sum(3)
let ans2= sumadv(3)
console.log(ans)
console.log(ans2)