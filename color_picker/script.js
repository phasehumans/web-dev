const colorInput= document.getElementById('colorbox')
const colorCode = document.getElementById('colorcode')
const copybtn= document.getElementById('copy')

const compleColor= document.getElementById('complelclr')



colorInput.addEventListener('input', () => {
    const selected_clr= colorInput.value
    updatecolorDisplay(selected_clr)
    showComplement(selected_clr)
})

function updatecolorDisplay(color){
    colorCode.textContent= color
    colorCode.style.color = color

}

function showComplement(color){
    const compclr= getCompclr(color)

    compleColor.innerHTML= ""

    compclr.forEach((color) => {
        const colorbox= document.createElement('div')
        colorbox.classList.add('compleclr')
        colorbox.style.backgroundColor= compclr
        compleColor.appendChild(colorbox)
    })
}


function getCompclr(color){
    const base= parseInt(color.slice(1,))

    const compliment= (0xFFFFFF ^ base).toString(16).padStart(6, '0')
    return `#${compliment}`
}