const button= document.getElementById('btn')
const resultArea= document.getElementById('result')
const dice= document.getElementById('dice')

const diceFaces= ['\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685']

function rollDice(){
    const index= Math.floor(Math.random()* 6)
    dice.textContent= diceFaces[index]
    resultArea.textContent= `You rolled a ${index + 1}`
}


button.addEventListener('click', rollDice) 