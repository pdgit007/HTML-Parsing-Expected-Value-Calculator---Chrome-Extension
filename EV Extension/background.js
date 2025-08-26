importScripts('logger.js');

chrome.commands.onCommand.addListener((command) => {
    console.log(`Command received: ${command}`); // Log the received command
    if (command === "run-extension") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const tabId = tabs[0].id;
                console.log(`Executing script on tab ID: ${tabId}`); // Log the tab ID
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabId },
                        files: ['popupV2.js']
                    },
                    () => {
                        console.log('Extension triggered via keybind');
                    }
                );
            } else {
                console.error('No active tab found.');
            }
        });
    }
});

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'runSimulator') {
            // Run the Python simulator_runner.py script
            const { input } = message;
            // Use Native Messaging or a local server to run Python (here, we use fetch to localhost for demo)
            fetch('http://localhost:5005/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: input
            })
            .then(res => res.json())
            .then(result => sendResponse({ result }))
            .catch(error => sendResponse({ error: error.toString() }));
            return true; // Keep the message channel open for async response
        }
    });
}