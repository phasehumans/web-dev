let student ={
    name : "chaitanya",
    "rollno": 39,
    "prn": 231107042,
    "address": {
        "hometown": "indave",
        "pincode": 425408
    },

}


console.log(student.rollno)
console.log(student.address)
console.log(student.address.pincode)


student.greet= function(name){
    // console.log(`hello ${this.name}`);
    return this.name + name
}

console.log(student.greet("sskff"))     //chaitanyasskff