// Handles autorun logic for the extension
(function() {
    const autorunBtn = document.getElementById('autorun-btn');
    const linksTextarea = document.getElementById('autorun-links');
    const statusDiv = document.getElementById('autorun-status');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');

    let isPaused = false;
    let resumeCallback = null;

    if (!autorunBtn || !linksTextarea || !statusDiv) return;

    if (pauseBtn && resumeBtn) {
        pauseBtn.addEventListener('click', () => {
            isPaused = true;
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = '';
        });
        resumeBtn.addEventListener('click', () => {
            isPaused = false;
            resumeBtn.style.display = 'none';
            pauseBtn.style.display = '';
            if (resumeCallback) {
                resumeCallback();
                resumeCallback = null;
            }
        });
    }

    // Listen for popup mode autorun trigger
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'startPopupAutorun') {
            runAutorunSequence(true);
            sendResponse({ status: 'Popup mode autorun started.' });
        }
    });

    // === NEW WINDOW TOGGLE LOGIC ===
    const newWindowToggle = document.getElementById('autorun-new-window-toggle');
    let autorunNewWindow = false;
    if (newWindowToggle) {
        chrome.storage.local.get(['autorunNewWindow'], function(data) {
            autorunNewWindow = !!data.autorunNewWindow;
            newWindowToggle.checked = autorunNewWindow;
        });
        newWindowToggle.addEventListener('change', function() {
            autorunNewWindow = newWindowToggle.checked;
            chrome.storage.local.set({ autorunNewWindow });
        });
    }

    // Main autorun logic, supports new window mode
    async function runAutorunSequence() {
        const loadTimeInput = document.getElementById('autorun-load-time');
        let loadTime = 2000;
        if (loadTimeInput && loadTimeInput.value) {
            loadTime = Math.max(500, parseInt(loadTimeInput.value, 10) || 2000);
        }
        // Get manual delay from new input
        let manualDelay = 0;
        const manualDelayInput = document.getElementById('autorun-manual-delay');
        if (manualDelayInput && manualDelayInput.value) {
            manualDelay = Math.max(0, parseInt(manualDelayInput.value, 10) || 0);
        }
        const links = linksTextarea.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (!links.length) {
            statusDiv.textContent = 'Please paste at least one link.';
            return;
        }
        autorunBtn.disabled = true;
        pauseBtn.disabled = false;
        statusDiv.textContent = `Starting autorun for ${links.length} links...`;
        let completed = 0;
        for (const link of links) {
            statusDiv.textContent = `Loading (${completed+1}/${links.length}): ${link}`;
            try {
                if (autorunNewWindow) {
                    await runAutorunOnLinkNewWindow(link, loadTime, manualDelay);
                } else {
                    await runAutorunOnLink(link, loadTime, manualDelay);
                }
                // Pause after each tab if requested
                if (isPaused) {
                    statusDiv.textContent = `Paused after ${completed+1} of ${links.length} links.`;
                    await new Promise(res => { resumeCallback = res; });
                }
                completed++;
            } catch (e) {
                statusDiv.textContent = `Error on ${link}: ${e}`;
                break;
            }
        }
        statusDiv.textContent = `Autorun complete. Processed ${completed} of ${links.length} links.`;
        autorunBtn.disabled = false;
        pauseBtn.disabled = true;
        resumeBtn.style.display = 'none';
        pauseBtn.style.display = '';
        isPaused = false;
    }

    autorunBtn.addEventListener('click', () => runAutorunSequence());

    async function runAutorunOnLink(link, loadTime, manualDelay) {
        return new Promise((resolve, reject) => {
            chrome.tabs.create({ url: link, active: false }, (tab) => {
                if (!tab || !tab.id) return reject('Could not open tab');

                chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                    if (tabId === tab.id && info.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        // Manual delay after load, before script injection
                        setTimeout(() => {
                            chrome.scripting.executeScript({
                                target: { tabId: tab.id },
                                files: ['popupV2.js']
                            }, () => {
                                setTimeout(() => {
                                    chrome.tabs.remove(tab.id);
                                    resolve();
                                }, loadTime);
                            });
                        }, manualDelay);
                    }
                });
            });
        });
    }

    // Open link in a new window and run calculation
async function runAutorunOnLinkNewWindow(link, loadTime, manualDelay) {
    return new Promise((resolve, reject) => {
        chrome.windows.create({ url: link, type: 'popup', focused: false, width: 1920, height: 1080 }, (win) => {
            if (!win || !win.tabs || !win.tabs[0] || !win.tabs[0].id) return reject('Could not open window');
            const tabId = win.tabs[0].id;
            chrome.tabs.onUpdated.addListener(function listener(tabId2, info) {
                if (tabId2 === tabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);

                    // Set zoom to 25%
                    chrome.tabs.setZoom(tabId, 1, () => {
                        // After zoom is set, delay and inject script
                        setTimeout(() => {
                            chrome.scripting.executeScript({
                                target: { tabId: tabId },
                                files: ['popupV2.js']
                            }, () => {
                                setTimeout(() => {
                                    chrome.windows.remove(win.id, resolve);
                                }, loadTime);
                            });
                        }, manualDelay);
                    });
                }
            });
        });
    });
}
})();
