const BaseAgent = require('../BaseAgent');


class Formatter extends BaseAgent{

    templatePath = `${__dirname}/prompt.handlebars`;

}

module.exports = Formatter;