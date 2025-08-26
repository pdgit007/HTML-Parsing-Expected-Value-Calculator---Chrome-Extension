document.addEventListener('DOMContentLoaded', function() {
    const autoClickOddsCheckbox = document.getElementById('autoClickOdds');
    const lowBandwidthCheckbox = document.getElementById('lowBandwidthMode');
    chrome.storage.local.get(['autoClickOdds', 'lowBandwidthMode'], function(result) {
        autoClickOddsCheckbox.checked = !!result.autoClickOdds;
        lowBandwidthCheckbox.checked = !!result.lowBandwidthMode;
    });
    autoClickOddsCheckbox.addEventListener('change', function() {
        chrome.storage.local.set({ autoClickOdds: autoClickOddsCheckbox.checked });
    });
    lowBandwidthCheckbox.addEventListener('change', function() {
        chrome.storage.local.set({ lowBandwidthMode: lowBandwidthCheckbox.checked });
    });
});
