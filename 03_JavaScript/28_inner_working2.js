const obj1= {
        name: "Chaitanya",
        greet: function(){
                console.log(`Good Morning, ${this.name}`);
                
        }
}

const obj2 = {
        name: "Anant",
        greet: function(){
                console.log(`Good morning ${this.name}`);
                
        }
}

console.log("hello");


// obj1.greet()
obj2.greet()

setTimeout(obj1.greet, 1000 * 3)        // Good Morning, undefined

// soln --> bind w/ context
setTimeout(obj1.greet.bind(obj1), 1000 * 4)
setTimeout(obj1.greet.bind(obj2), 1000 * 4)

console.log("byee");

