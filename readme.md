# Talk With Avator Using DID Agents

This project demonstrates the use of D-ID's `talks` API for creating AI-driven video agents capable of interactive communication. The front-end is built using HTML, CSS, and JavaScript, and it integrates with the D-ID API to handle video streams and chat functionalities.

Here’s how the demo looks:

![Sample Video](Sample-Video.gif)


## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/SyedAffan10/Talk-With-Avator-Using-DID-Agents.git
    cd Talk-With-Avator-Using-DID-Agents
    ```

2. Install necessary dependencies:
   - Ensure you have a server (e.g., `Live Server` extension in VSCode) to serve the HTML file. 
   - Fetch `axios` via a CDN for HTTP requests if not already included in `index.html`.

3. Run the project:
   - Open `index-agents.html` in a browser.

## Usage

- **Starting a Conversation:**
  - Type your message in the text input box and press the **Send** button.

- **Video Streaming:**
  - The agent's responses are streamed as video, and the video element updates dynamically during the conversation.

## Configuration

Update the `api.json` file with your API key and URL:
```json
{
    "key": "your_api_key_here",
    "url": "https://api.d-id.com",
    "service": "talks"
}
```