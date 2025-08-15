const number1= document.getElementById('num1')
const number2= document.getElementById('num2')
const ans= document.getElementById('ans')

const addBtn= document.getElementById('add')
const subBtn= document.getElementById('sub')
const multiBtn= document.getElementById('multi')
const divBtn= document.getElementById('div')



function addition(){
    let num1= number1.value
    let num2= number2.value

    let res= num1 + num2

    ans.textContent= res
    
}
function substraction(){
    let num1= number1.value
    let num2= number2.value

    let res= num1 - num2

    ans.textContent= res
    
}
function multiplication(){
    let num1= number1.value
    let num2= number2.value

    let res= num1 * num2

    ans.textContent= res
    
}
function division(){
    let num1= number1.value
    let num2= number2.value

    if(num2 == 0){
        ans.textContent= "Not divide by Zero"
    }
    else{
        let res= num1 / num2
        ans.textContent= res
    }
    
}

addBtn.addEventListener('click', addition)
subBtn.addEventListener('click', substraction)
multiBtn.addEventListener('click', multiplication)
divBtn.addEventListener('click', division)

