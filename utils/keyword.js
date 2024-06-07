const deDict = require('@shopping24/rake-js/dist/de');
const rakejs = require('@shopping24/rake-js');
const rake = require('node-rake')

 function processKeywords(text) {
    try {
        const keywords = rake.generate(text)
        return keywords
    } catch (error) {
        console.error("Error processing keywords:", error);
        return [];
    }
}

let res=processKeywords(`Creating index.js file and writing "hi" in it`);
console.log(res)

module.exports ={
    processKeywords
}
