const quotes = [
    "The best way to get started is to quit talking and begin doing. – Walt Disney",
    "Don’t let yesterday take up too much of today. – Will Rogers",
    "It’s not whether you get knocked down, it’s whether you get up. – Vince Lombardi",
    "If you are working on something exciting, it will keep you motivated. – Steve Jobs",
    "Success is not in what you have, but who you are. – Bo Bennett",
    "Hard times create strong people. – Unknown",
    "Do something today that your future self will thank you for. – Sean Patrick Flanery",
    "Don’t watch the clock; do what it does. Keep going. – Sam Levenson",
    "The secret of getting ahead is getting started. – Mark Twain",
    "Everything you’ve ever wanted is on the other side of fear. – George Addair",
    "Doubt kills more dreams than failure ever will. – Suzy Kassem",
    "Dream bigger. Do bigger. – Unknown",
    "Opportunities don’t happen, you create them. – Chris Grosser",
    "It always seems impossible until it’s done. – Nelson Mandela",
    "Great things never come from comfort zones. – Unknown",
    "Push yourself, because no one else is going to do it for you. – Unknown",
    "Don’t stop when you’re tired. Stop when you’re done. – Unknown",
    "Work hard in silence. Let your success be the noise. – Frank Ocean",
    "What you get by achieving your goals is not as important as what you become. – Zig Ziglar",
    "Hustle in silence and let your results speak. – Unknown"
];

const quoteArea= document.getElementById('insertquote')
const genBtn= document.getElementById('generate')

function DisplayQuote(){
    let randomQuote= quotes[Math.floor(Math.random() * quotes.length)]
    // index will be a random numeber betn quotes length, whole number(x decimal)
    quoteArea.textContent= randomQuote
}

genBtn.addEventListener('click', DisplayQuote)

