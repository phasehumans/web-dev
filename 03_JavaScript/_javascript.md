# JavaScript

## Variable
- let: can update and redeclare
- const: can't update and redeclare
- var is not used (hoisting err | fn scope err)

## Input & Output
- console.log("text")
- console.log(`text is here ${var} another text here`)

## DataTypes

### Primitive
- immutable
- call by value - copy of data, changes are in copy

1. Number
2. String
3. Boolean
4. Undefined
5. Null
6. Symbol -> used to create unique indetifiers

### Non-Primitive / Reference
- mutable
- call by ref - direct ref of memory address

1. Object -> collection of key value pair  { }
2. Array -> [ ]


## Operators
1. arithmetic: + - * / % **
2. comparision: < > >= <= == ===(strict check) !=
3. logical: && (and), || (or), !(not)
4. bitwise: & | ! ^ (XOR)
5. assign: =
6. nullish coalescing: ?? returns RH value when LH is null


## Memory in JS
- stack(primitive) -> copy is pass
- heap(non primitive) -> ref is pass

### Stack
- ref variable are stored w/ memory address
### Heap
- actual data is stored and unique memory address is given


- primitive -> separte address and ref var
- non primitive: obj1 ---->  memoy_address <------ obj2; so one change then another also gets change


## Strings
- used to hold data that is represented in text form
- immutable
- var.__proto__ --> obj of methods

#### Methods
- str[index] --> access char  
- str.charat(index) --> acces char
- length  
- toUpperCase()  
- toLoweCase()
- indexof("value")
- inclues("value") --> T/F
- slice(start,end)
- replace("old", "new")
- trim() --> remove spaces
- split(separator, limit)
- repeat(interval)
- concat(" ", str2) --> join two str; str1 + str2


## Arrays
- used to store multi values in single var
- dynamic and hetro elmt

#### Methods
- push() --> add at last
- unshift() --> add at first 
- pop() --> remove last emlt
- shift() --> remove first elmt
- indexof() --> returns index of search emlt (-1)
- findindex() -->  returns the index
- includes() --> T/F
- foreach() --> iterate over array, modify og
- map() --> iterate, not modify og  
array.map(callback(element, index, array), thisArg);
- reduce --> reduce arr to single value and return single value
- filter() --> return filter arr based on condn, not change og
- sort() --> sort
- reverse() --> reverse, modify og
- flat(infinity)  --> merge subarrays
- conact(newarr)  --> add arr
- find()
- findLast()
- findLastIndex()
- join()  --> joins and return as str
- slice()
- toSpliced() --> similar to slice, no chnage in og



## Objects
- collection of key value pair 
- Objects --> Represent Properties, Methods[Functionalities]
- Properties -->  Attribute: Color, weight etc.
- Method -->  Actions, functions

## Shallow copy & Deep copy
- shallow copy only copies the top-level of an object
- Nested objects/arrays are shared references — changes in one affect the other
- why -> primitive → copied by value. & object → copied by reference.
- A deep copy copies everything, including nested objects, so the new object is fully independent.

## Functions
- reusable block of code
- Arrow function: consise way to write fn  
- IFFE: Immediately Invoked Function Expression : execute immediately after defination  
- higher order fn: fn that take another fn as argument
- recursive fn: fn calls itself


scope:
- global scope
- local scope : inside {}

## Control Flow
- conditionals
- iteration / loop

### Conditionls
- if = agar ye condition true hai
- else if = warna agar dusri condition true hai
- else = sab galat ho gaya toh ye karo

Ternary: condition ? expressionIfTrue : expressionIfFalse;  

Switch: used to test one variable or expression against multiple possible values  
- break
- default
- case

## ES6+

### Hoisting
- mechanism where variable and function declarations are moved to the top of their containing scope during the compilation phase, before the code is executed. However, only the declarations are hoisted—not the initializations.

- var  -> undefined
- let and const  -> referror
- Block Scope (let and const): Variables declared with let and const are limited to the block where they are defined. Example: Inside a loop or conditional block.
- Function Scope (var): Variables declared with var are limited to the nearest function. If declared outside any function, they become global variables.
- avoid var, unless legacy code


### Arrow fn




