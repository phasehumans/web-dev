const inputText= document.getElementById('inputText')
const btn= document.getElementById('btn')
const result = document.getElementById('result')


function checkPaindrome(){
    let textValue = inputText.value;
    let cleaned = textValue.replace(/[^a-z0-9]/gi, '').toLowerCase();   
    let revValue= cleaned.split('').reverse().join('')

    if (cleaned == revValue){
        result.textContent= "Palindrome"
    }
    else{
        result.textContent= "Not Palindrome"
    }

    // let textValue = inputText.value;
    // let cleaned = textValue.replace(/[^a-z0-9]/gi, '').toLowerCase();

    // if (cleaned === cleaned.split('').reverse().join('')) {
    //     result.textContent = "It's a palindrome!";
    // } else {
    //     result.textContent = "Not a palindrome.";
    // }

}

btn.addEventListener('click', checkPaindrome)