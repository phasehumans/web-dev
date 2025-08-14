const inputcontainer = document.getElementById('inputcontainer')
const start= document.getElementById('start')
const para = document.getElementById('para')

function startcountdown(){
    let valueSec= parseInt(inputcontainer.value)

    if(isNaN(valueSec)){
        para.innerText = "Please enter value has number"
        return
    }
    if(valueSec <= 0){
        para.innerText= "Please enter value greater than 0"
        return
    }

    const timer= setInterval(function(){
        valueSec --
        para.innerText= `${valueSec} seconds`


        if(valueSec <= 0){
            clearInterval(timer)
            para.innerText= "time is up"
        }
    }, 1 * 1000)



}

start.addEventListener('click', startcountdown)