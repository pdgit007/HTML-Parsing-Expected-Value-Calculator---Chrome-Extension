const logsKey = 'calculationLogs';

function logCalculation(url, realValue, comparedValue, expectedValue) {
    const logEntry = `${url}, ${realValue}, ${comparedValue}, ${expectedValue}`;
    chrome.storage.local.get([logsKey], (result) => {
        const logs = result[logsKey] || [];
        logs.push(logEntry);
        chrome.storage.local.set({ [logsKey]: logs });
    });
}

function downloadLogs() {
    chrome.storage.local.get([logsKey], (result) => {
        const logs = result[logsKey] || [];
        const csvContent = logs.map(log => log.split(', ').join(',')).join('\n'); // Convert logs to CSV format
        const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);

        chrome.downloads.download({
            url: dataUrl,
            filename: 'calculation_logs.csv', // Ensure the file is saved with a .csv extension
            saveAs: true
        });
    });
}

function clearLogs() {
    chrome.storage.local.set({ [logsKey]: [] }); // Clear the logs in storage
}

// Debug: Log the current logs on extension startup
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get([logsKey], (result) => {
        console.log('Logs on startup:', result[logsKey] || []);
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'logCalculation') {
        logCalculation(message.data.url, message.data.realValue, message.data.comparedValue, message.data.expectedValue);
    } else if (message.action === 'downloadLogs') {
        downloadLogs();
    } else if (message.action === 'clearLogs') {
        clearLogs();
    }
});