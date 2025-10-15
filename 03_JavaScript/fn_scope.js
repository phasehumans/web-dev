let color= "black"

function myFavColor (clr) {

    let secondeFav= "gold"
    return `my fav color is ${clr} & ${secondeFav}`
}

console.log(myFavColor(color))
console.log(myFavColor())
console.log(myFavColor)             // ref of fn: this does not execute



function secondeFavColor (clr){
    return `my second fav color is ${clr}`
}

// console.log(secondeFavColor(secondeFav))             // ReferenceError: secondeFav is not defined


