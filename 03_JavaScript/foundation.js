let x= 10
let y= x

console.log(x);
console.log(y);

x= 15
console.log(x);
console.log(y);


let obj1={
    name:"Chaitanya",
    rollno: 40,
    prn:231107042

}

let obj2= obj1
console.log(obj1);
console.log(obj2);

obj1.rollno= 39

console.log(obj1);
console.log(obj2);


let a= "anyname"
console.log(a.__proto__);   //{} obj of methods
