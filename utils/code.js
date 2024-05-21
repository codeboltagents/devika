const fs = require('fs');
const path = require('path');


class ReadCode {
    constructor(projectPath) {

        this.directoryPath = projectPath
    }

    readDirectory() {
        const filesList = [];
        try {
            const files = fs.readdirSync(this.directoryPath, { withFileTypes: true });
            files.forEach(file => {
                if (file.isFile()) {
                    if (file.name != 'chat.json') {
                        const filePath = path.join(this.directoryPath, file.name);
                        try {
                            const fileContent = fs.readFileSync(filePath, 'utf8');
                            filesList.push({ filename: filePath, code: fileContent });
                        } catch (error) {
                            console.error(`Error reading file ${filePath}:`, error);
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error reading directory:', error);
        }
        return filesList;
    }

    codeSetToMarkdown() {
        const codeSet = this.readDirectory();
        let markdown = "";
        codeSet.forEach(code => {
            markdown += `### ${code.filename}:\n\n`;
            markdown += `\`\`\`\n${code.code}\n\`\`\`\n\n`;
            markdown += "---\n\n";
        });
        return markdown;
    }
}

module.exports = { ReadCode };
