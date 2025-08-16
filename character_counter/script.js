const textInput= document.getElementById('inputText')
const area= document.getElementById('counter')


function count(){
    const text= textInput.value
    const countValue= text.length

    area.textContent = `${countValue} characters`
}

textInput.addEventListener('input', count)