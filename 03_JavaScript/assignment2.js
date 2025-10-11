function canVote (age) {
    if (age >= 18) {
        return true
    }else {
        return false
    }
}


console.log(canVote(33))
console.log(canVote(13))