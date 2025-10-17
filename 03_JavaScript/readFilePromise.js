import fs from "fs"

const fs= fs()

function readFilePromise (filename){
    return new Promise(function resolve(){
        fs.readFile(filename, "utf-8", function(err, data){
            resolve(data)
        })
    })
}


readFilePromise("sample.txt").then((data) => {
    console.log(data)
})