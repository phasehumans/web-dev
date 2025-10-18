const button= document.getElementById('btn')
// get element based onn its id, class or type

function changeClr(){

    const red= Math.floor(Math.random() * 256)
    const green= Math.floor(Math.random() * 256)
    const blue= Math.floor(Math.random() * 256)

    document.body.style.backgroundColor= `rgb(${red},${green},${blue})`
}

// evenlistner, if click then run this fn (changeclr)
button.addEventListener('click' , changeClr)