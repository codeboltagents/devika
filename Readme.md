# Action Agent

This is an Action Agent. It takes the current user Input and Returns the next process to accomplish.

## Structure

The structure is that it has an 
- Execute function, which 
    - Takes the conversation and 
    - Renders it into a prompt
- Checks the Result. 
    - If the result is correct, then  it returns the response, 
    - Else it runs the Execute function again