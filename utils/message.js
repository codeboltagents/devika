async function getAllMessagesFormatted(messageStack) {
    const formattedMessages = [];

    try {
     
            for (const message of messageStack) {
                if (message.type='agentMessage') {
                    formattedMessages.push(`Devika: ${message.message}`);
                } else {
                    formattedMessages.push(`User: ${message.message}`);
                }
            }
    
    } catch (error) {
        console.error("Error while retrieving formatted messages:", error);
    }

    return formattedMessages;
}

module.exports={
    getAllMessagesFormatted
}
