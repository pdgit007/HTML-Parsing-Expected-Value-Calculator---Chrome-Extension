// Only run chrome.tabs.query and chrome.scripting.executeScript if those APIs are available
if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const tabId = tabs[0].id;
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabId },
                    files: ['popupV2.js']
                },
                () => {
                    console.log('Script executed automatically on extension click');
                }
            );
        } else {
            console.error('No active tab found.');
        }
    });

    document.getElementById('parseButton').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const tabId = tabs[0].id;
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabId },
                        files: ['popupV2.js']
                    },
                    () => {
                        console.log('Script executed');
                    }
                );
            } else {
                console.error('No active tab found.');
            }
        });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'parsedData') { 
        const resultDiv = document.getElementById('result');
        const { compared, odds, values, expectedValue } = message.data;

        // Calculate the real value (expected value - compared value)
        const realValue = compared !== null ? (expectedValue - compared).toFixed(4) : 'N/A';
        // Calculate margin (real value / compared value)
        let margin = 'N/A';
        if (compared && compared !== 0 && realValue !== 'N/A') {
            margin = (parseFloat(realValue) / compared).toFixed(4);
        }

        // Highlight the popup based on the real value
        const popupBody = document.body;
        if (realValue !== 'N/A') {
            popupBody.style.backgroundColor = realValue >= 0 ? 'green' : 'orange';
        } else {
            popupBody.style.backgroundColor = '';
        }

        // Log the calculation
        chrome.runtime.sendMessage({
            action: 'logCalculation',
            data: {
                url: sender.url,
                realValue,
                comparedValue: compared,
                expectedValue
            }
        });

        // Display the real value prominently
        const oddsSum = odds.reduce((a, b) => a + b, 0);
        resultDiv.innerHTML = `
            <h2>Real Value: ${realValue}</h2>
            <h2 style="margin-top:0;"><strong>Margin:</strong> ${margin}</h2>
            <hr>
            <button id="toggleDataButton">Show Details</button>
            <div id="details" style="display: none;">
                <h3>Parsed Data</h3>
                <p><strong>Compared Value:</strong> ${compared}</p>
                <p><strong>Odds (${odds.length}):</strong> ${odds.join(', ')}</p>
                <p><strong>Values (${values.length}):</strong> ${values.join(', ')}</p>
                <hr>
                <h3>Calculations</h3>
                <p><strong>Expected Value:</strong> ${expectedValue.toFixed(2)}</p>
                <p><strong>Sum of Odds:</strong> ${oddsSum.toFixed(4)}</p>
            </div>
        `;

        // Add toggle functionality for details
        const toggleButton = document.getElementById('toggleDataButton');
        const detailsDiv = document.getElementById('details');
        toggleButton.addEventListener('click', () => {
            if (detailsDiv.style.display === 'none') {
                detailsDiv.style.display = 'block';
                toggleButton.textContent = 'Hide Details';
            } else {
                detailsDiv.style.display = 'none';
                toggleButton.textContent = 'Show Details';
            }
        });
    }
});

// Add a button to download logs
const downloadButton = document.createElement('button');
downloadButton.textContent = 'Download Logs';
downloadButton.style.marginTop = '10px';
downloadButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'downloadLogs' });
});
document.body.appendChild(downloadButton);

// Add a button to clear logs
const clearLogsButton = document.createElement('button');
clearLogsButton.textContent = 'Clear Logs';
clearLogsButton.style.marginTop = '10px';
clearLogsButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'clearLogs' });
    alert('Logs have been cleared.');
});
document.body.appendChild(clearLogsButton);

// --- SIMULATOR INTEGRATION (MULTI-SESSION JS VERSION) ---
function runSimulatorJS(odds, values, cost_per_play, starting_balance, num_simulations = 1000, num_sessions = 150) {
    let bust_count = 0;
    let final_balances = [];
    for (let session = 0; session < num_sessions; session++) {
        let balance = starting_balance;
        let busted = false;
        for (let i = 0; i < num_simulations; i++) {
            if (balance < cost_per_play) {
                busted = true;
                break;
            }
            balance -= cost_per_play;
            let outcome = 0;
            for (let j = 0; j < odds.length; j++) {
                if (Math.random() < odds[j]) {
                    outcome += values[j];
                }
            }
            balance += outcome;
        }
        if (busted) bust_count++;
        final_balances.push(balance);
    }
    const bust_percent = num_sessions ? (bust_count / num_sessions) * 100 : 0;
    const average_final_balance = final_balances.length ? final_balances.reduce((a, b) => a + b, 0) / final_balances.length : 0;
    return {
        bust_count,
        num_sessions,
        bust_percent,
        average_final_balance,
        final_balances
    };
}

// Replace runSimulator with multi-session JS version
function runSimulator(odds, values, cost_per_play, starting_balance, num_simulations = 1000, num_sessions = 150) {
    return Promise.resolve(runSimulatorJS(odds, values, cost_per_play, starting_balance, num_simulations, num_sessions));
}

function showSimulatorResult(result) {
    const simResultDiv = document.getElementById('simulator-result');
    if (!result) {
        simResultDiv.textContent = 'No result.';
        return;
    }
    let html = `<strong>Busts:</strong> ${result.bust_count}/${result.num_sessions} sessions (${result.bust_percent.toFixed(2)}%)<br>`;
    html += `<strong>Average Final Balance:</strong> $${result.average_final_balance.toFixed(2)}<br>`;
    html += '<details><summary>Show All Final Balances</summary><pre style="max-height:200px;overflow:auto;">' +
        result.final_balances.map((b, i) => `Session ${i+1}: $${b.toFixed(2)}`).join('\n') + '</pre></details>';
    simResultDiv.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    // --- Pop Out Button Logic ---
    const popoutBtn = document.getElementById('popout-btn');
    if (popoutBtn) {
        // Hide the button if already in a standalone window (heuristic: window.opener or window.outerWidth > 400)
        if (!window.opener && window.outerWidth > 400) {
            popoutBtn.style.display = 'none';
        } else {
            popoutBtn.addEventListener('click', function() {
                chrome.windows.create({
                    url: chrome.runtime.getURL('popup.html'),
                    type: 'popup',
                    width: 500,
                    height: 700
                });
                window.close(); // Close the original popup
            });
        }
    }

    const autoClickOddsCheckbox = document.getElementById('autoClickOdds');
    chrome.storage.local.get(['autoClickOdds'], function(result) {
        autoClickOddsCheckbox.checked = !!result.autoClickOdds;
    });
    autoClickOddsCheckbox.addEventListener('change', function() {
        chrome.storage.local.set({ autoClickOdds: autoClickOddsCheckbox.checked });
    });

    const autorunLowBandwidthCheckbox = document.getElementById('autorunLowBandwidthMode');
    if (autorunLowBandwidthCheckbox) {
        chrome.storage.local.get(['lowBandwidthMode'], function(result) {
            autorunLowBandwidthCheckbox.checked = !!result.lowBandwidthMode;
        });
        autorunLowBandwidthCheckbox.addEventListener('change', function() {
            chrome.storage.local.set({ lowBandwidthMode: autorunLowBandwidthCheckbox.checked });
        });
    }

    const runBtn = document.getElementById('runSimulatorBtn');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            // Get current odds, values, and compared value from last parse (if available)
            const odds = window.lastParsedOdds || [];
            const values = window.lastParsedValues || [];
            const cost_per_play = window.lastParsedComparedValue || 0;
            const starting_balance = parseFloat(document.getElementById('sim-starting-balance').value) || 20;
            if (!odds.length || !values.length || !cost_per_play) {
                showSimulatorResult({ final_balance: 0, busted: false, history: [[0, 'Missing odds/values/cost']] });
                return;
            }
            document.getElementById('simulator-result').textContent = 'Running simulation...';
            try {
                const result = await runSimulator(odds, values, cost_per_play, starting_balance);
                showSimulatorResult(result);
            } catch (e) {
                showSimulatorResult({ final_balance: 0, busted: false, history: [[0, 'Error: ' + e]] });
            }
        });
    }

    // Add a button to the popup UI for teaching mode
    let teachBtn = document.createElement('button');
    teachBtn.textContent = 'Start Selector Search Mode';
    teachBtn.style.margin = '12px 0';
    teachBtn.style.padding = '8px 16px';
    teachBtn.style.background = '#222';
    teachBtn.style.color = '#fff';
    teachBtn.style.border = '1px solid #444';
    teachBtn.style.borderRadius = '6px';
    teachBtn.style.cursor = 'pointer';
    teachBtn.style.fontWeight = 'bold';
    teachBtn.title = 'Click to activate selector search overlay on the current page.';
    document.body.appendChild(teachBtn);

    // Move Manage Selectors button here
    let manageBtn = document.getElementById('manageSelectorsBtn');
    if (manageBtn) {
        manageBtn.style.display = '';
        manageBtn.style.margin = '12px 0';
        manageBtn.style.padding = '8px 16px';
        manageBtn.style.background = '#222';
        manageBtn.style.color = '#fff';
        manageBtn.style.border = '1px solid #444';
        manageBtn.style.borderRadius = '6px';
        manageBtn.style.cursor = 'pointer';
        manageBtn.style.fontWeight = 'bold';
        manageBtn.title = 'View and edit selectors used for parsing.';
        teachBtn.insertAdjacentElement('afterend', manageBtn);
    }

    teachBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: {tabId: tabs[0].id},
                    files: ['selectorsearch.js']
                });
            }
        });
    });

    // === SELECTOR MANAGER LOGIC ===
    const modal = document.getElementById('selectorModal');
    const selectorsBySiteContainer = document.getElementById('selectorsBySiteContainer');
    const saveBtn = document.getElementById('saveSelectorsBtn');
    const cancelBtn = document.getElementById('cancelSelectorsBtn');
    const downloadBtn = document.getElementById('downloadSelectorsBtn');
    const importBtn = document.getElementById('importSelectorsBtn');
    const importInput = document.getElementById('importSelectorsInput');
    const addBtn = document.getElementById('addSelectorBtn');
    const addModal = document.getElementById('addSelectorModal');
    const addSiteInput = document.getElementById('addSiteInput');
    const addTypeInput = document.getElementById('addTypeInput');
    const addSelectorInput = document.getElementById('addSelectorInput');
    const addSaveBtn = document.getElementById('addSelectorSaveBtn');
    const addCancelBtn = document.getElementById('addSelectorCancelBtn');

    // Helper to render selectors grouped by site and type
    function renderSelectorsBySite(selectorList) {
        // Group selectors by site and type, but keep original objects for deletion
        const grouped = {};
        selectorList.forEach((sel, idx) => {
            if (!grouped[sel.site]) grouped[sel.site] = { odds: [], value: [], compared: [] };
            if (sel.type === 'odds') grouped[sel.site].odds.push({ ...sel, _idx: idx });
            if (sel.type === 'value') grouped[sel.site].value.push({ ...sel, _idx: idx });
            if (sel.type === 'compared') grouped[sel.site].compared.push({ ...sel, _idx: idx });
        });
        selectorsBySiteContainer.innerHTML = '';
        Object.keys(grouped).sort().forEach(site => {
            const section = document.createElement('div');
            section.style.marginBottom = '8px';
            section.innerHTML = `
                <details style="margin-bottom:4px; border:1px solid #bbb; border-radius:7px; background:#f8f9fa; box-shadow:0 1px 4px #0001;" >
                  <summary style="font-weight:600;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-radius:7px 7px 0 0;background:#e9ecef;transition:background 0.2s;user-select:none;outline:none;">
                    <span style='overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;'>${site}</span>
                    <button class="delete-site-btn" data-site="${site}" title="Delete all selectors for this site" style="background:none;border:none;cursor:pointer;color:#c00;font-size:16px;margin-left:10px;padding:2px 6px;border-radius:4px;transition:background 0.2s;" tabindex="-1" onmouseover="this.style.background='#f8d7da'" onmouseout="this.style.background='none'">🗑️</button>
                  </summary>
                  <div style="margin:6px 0 0 10px;">
                    <div style="margin-bottom:4px;">
                      <label style='font-size:13px;color:#444;'>Odds Selectors:</label><br>
                      ${grouped[site].odds.map((sel, i) => `
                        <div style='display:flex;align-items:center;margin-bottom:2px;'>
                          <textarea data-site="${site}" data-type="odds" data-idx="${sel._idx}" rows="1" style="width:85%;margin-right:4px;font-size:13px;padding:3px 6px;border-radius:4px;border:1px solid #ccc;resize:none;background:#fff;">${sel.selector}</textarea>
                          <button class="delete-selector-btn" title="Delete" data-idx="${sel._idx}" style="background:none;border:none;cursor:pointer;color:#c00;font-size:15px;padding:2px 6px;border-radius:4px;transition:background 0.2s;" tabindex="-1" onmouseover="this.style.background='#f8d7da'" onmouseout="this.style.background='none'">🗑️</button>
                        </div>
                      `).join('')}
                    </div>
                    <div style="margin-bottom:4px;">
                      <label style='font-size:13px;color:#444;'>Values Selectors:</label><br>
                      ${grouped[site].value.map((sel, i) => `
                        <div style='display:flex;align-items:center;margin-bottom:2px;'>
                          <textarea data-site="${site}" data-type="value" data-idx="${sel._idx}" rows="1" style="width:85%;margin-right:4px;font-size:13px;padding:3px 6px;border-radius:4px;border:1px solid #ccc;resize:none;background:#fff;">${sel.selector}</textarea>
                          <button class="delete-selector-btn" title="Delete" data-idx="${sel._idx}" style="background:none;border:none;cursor:pointer;color:#c00;font-size:15px;padding:2px 6px;border-radius:4px;transition:background 0.2s;" tabindex="-1" onmouseover="this.style.background='#f8d7da'" onmouseout="this.style.background='none'">🗑️</button>
                        </div>
                      `).join('')}
                    </div>
                    <div>
                      <label style='font-size:13px;color:#444;'>Compared Value Selectors:</label><br>
                      ${grouped[site].compared.map((sel, i) => `
                        <div style='display:flex;align-items:center;margin-bottom:2px;'>
                          <textarea data-site="${site}" data-type="compared" data-idx="${sel._idx}" rows="1" style="width:85%;margin-right:4px;font-size:13px;padding:3px 6px;border-radius:4px;border:1px solid #ccc;resize:none;background:#fff;">${sel.selector}</textarea>
                          <button class="delete-selector-btn" title="Delete" data-idx="${sel._idx}" style="background:none;border:none;cursor:pointer;color:#c00;font-size:15px;padding:2px 6px;border-radius:4px;transition:background 0.2s;" tabindex="-1" onmouseover="this.style.background='#f8d7da'" onmouseout="this.style.background='none'">🗑️</button>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </details>
            `;
            // Ensure details are closed by default
            const details = section.querySelector('details');
            if (details) details.open = false;
            selectorsBySiteContainer.appendChild(section);
        });
        // Add delete button listeners for selectors
        selectorsBySiteContainer.querySelectorAll('.delete-selector-btn').forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-idx'), 10);
                if (!isNaN(idx)) {
                    lastSelectorList.splice(idx, 1);
                    renderSelectorsBySite(lastSelectorList);
                }
            };
        });
        // Add delete button listeners for whole site
        selectorsBySiteContainer.querySelectorAll('.delete-site-btn').forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                const site = btn.getAttribute('data-site');
                if (site) {
                    // Remove all selectors for this site
                    lastSelectorList = lastSelectorList.filter(sel => sel.site !== site);
                    renderSelectorsBySite(lastSelectorList);
                }
            };
        });
    }

    let lastSelectorList = [];
    let modalOpen = false;

    function openSelectorModal() {
        chrome.storage.local.get({ selectorList: [] }, function(data) {
            lastSelectorList = Array.isArray(data.selectorList) ? data.selectorList : [];
            renderSelectorsBySite(lastSelectorList);
            modal.style.display = 'flex';
            modalOpen = true;
        });
    }

    manageBtn.addEventListener('click', openSelectorModal);

    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modalOpen = false;
    });

    saveBtn.addEventListener('click', () => {
        // Gather all textarea values by site/type
        const newList = [];
        const textareas = selectorsBySiteContainer.querySelectorAll('textarea[data-site][data-type]');
        textareas.forEach(textarea => {
            const site = textarea.getAttribute('data-site');
            const type = textarea.getAttribute('data-type');
            const selectors = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
            selectors.forEach(sel => newList.push({ site, type, selector: sel }));
        });
        // Save to storage
        chrome.storage.local.set({ selectorList: newList }, function() {
            lastSelectorList = newList;
            modal.style.display = 'none';
            modalOpen = false;
        });
    });

    // Download selectors as JSON
    downloadBtn.addEventListener('click', () => {
        chrome.storage.local.get({ selectorList: [] }, function(data) {
            const blob = new Blob([JSON.stringify(data.selectorList, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'selectors.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        });
    });

    // Import selectors from JSON
    importBtn.addEventListener('click', () => {
        importInput.value = '';
        importInput.click();
    });
    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const imported = JSON.parse(evt.target.result);
                if (!Array.isArray(imported)) throw new Error('Invalid format');
                chrome.storage.local.get({ selectorList: [] }, function(data) {
                    // Merge, but avoid exact duplicates
                    const existing = Array.isArray(data.selectorList) ? data.selectorList : [];
                    const merged = [...existing];
                    imported.forEach(sel => {
                        if (!merged.some(e => e.site === sel.site && e.type === sel.type && e.selector === sel.selector)) {
                            merged.push(sel);
                        }
                    });
                    chrome.storage.local.set({ selectorList: merged }, function() {
                        lastSelectorList = merged;
                        renderSelectorsBySite(lastSelectorList);
                    });
                });
            } catch (err) {
                alert('Import failed: ' + err.message);
            }
        };
        reader.readAsText(file);
    });

    // Add selector entry manually
    addBtn.addEventListener('click', () => {
        addSiteInput.value = '';
        addTypeInput.value = 'odds';
        addSelectorInput.value = '';
        addModal.style.display = 'flex';
    });
    addCancelBtn.addEventListener('click', () => {
        addModal.style.display = 'none';
    });
    addSaveBtn.addEventListener('click', () => {
        const site = addSiteInput.value.trim();
        const type = addTypeInput.value;
        const selector = addSelectorInput.value.trim();
        if (!site || !type || !selector) {
            alert('All fields are required.');
            return;
        }
        // Add to in-memory list and re-render
        lastSelectorList.push({ site, type, selector });
        renderSelectorsBySite(lastSelectorList);
        addModal.style.display = 'none';
    });

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal && modalOpen) modal.style.display = 'none';
    });
});

// Listen for parsedData to store odds/values/cost for simulator
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'parsedData') {
        window.lastParsedOdds = message.data.odds;
        window.lastParsedValues = message.data.values;
        window.lastParsedComparedValue = message.data.compared;
    }
});

// If you want to trigger the teaching panel from the extension popup, you can add a button in popup.html and call:
// window.open(chrome.runtime.getURL('teaching_panel.html'), 'SelectorTeachingPanel', 'width=600,height=700');
// in popup.js