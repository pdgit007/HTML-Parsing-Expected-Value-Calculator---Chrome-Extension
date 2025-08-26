// selectorsearch.js
// Overhauled: Only search, highlight, LCD/keep, and specificity (full/class/id)
(function() {
    // Overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '40px';
    overlay.style.left = '40px';
    overlay.style.background = 'rgba(0,0,0,0.15)';
    overlay.style.zIndex = 999999;
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'flex-start';
    overlay.style.pointerEvents = 'none';
    overlay.style.borderRadius = '12px';
    overlay.style.boxShadow = '0 2px 12px #0008';

    // GUI
    const gui = document.createElement('div');
    gui.style.background = '#222';
    gui.style.color = '#fff';
    gui.style.padding = '18px 24px';
    gui.style.borderRadius = '10px';
    gui.style.boxShadow = '0 2px 12px #0008';
    gui.style.pointerEvents = 'auto';
    gui.style.minWidth = '340px';
    gui.style.fontFamily = 'sans-serif';
    gui.style.position = 'relative';

    // Top bar
    const topBar = document.createElement('div');
    topBar.style.display = 'flex';
    topBar.style.justifyContent = 'space-between';
    topBar.style.alignItems = 'center';
    topBar.style.cursor = 'move';
    topBar.style.marginBottom = '8px';
    topBar.style.userSelect = 'none';
    topBar.style.height = '28px';
    topBar.style.fontWeight = 'bold';
    topBar.innerHTML = `<span style="font-size:16px;">Selector Search</span>`;
    // Drag logic
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
    function onDragStart(e) {
        isDragging = true;
        dragOffsetX = (e.touches ? e.touches[0].clientX : e.clientX) - overlay.offsetLeft;
        dragOffsetY = (e.touches ? e.touches[0].clientY : e.clientY) - overlay.offsetTop;
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchmove', onDragMove);
        document.addEventListener('touchend', onDragEnd);
    }
    function onDragMove(e) {
        if (!isDragging) return;
        let x = (e.touches ? e.touches[0].clientX : e.clientX) - dragOffsetX;
        let y = (e.touches ? e.touches[0].clientY : e.clientY) - dragOffsetY;
        overlay.style.left = Math.max(0, x) + 'px';
        overlay.style.top = Math.max(0, y) + 'px';
    }
    function onDragEnd() {
        isDragging = false;
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
    }
    topBar.addEventListener('mousedown', onDragStart);
    topBar.addEventListener('touchstart', onDragStart);
    // X button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close panel';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginLeft = '12px';
    closeBtn.style.marginRight = '-8px';
    closeBtn.style.padding = '0 6px';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.pointerEvents = 'auto';
    closeBtn.onmouseover = () => closeBtn.style.background = '#444';
    closeBtn.onmouseout = () => closeBtn.style.background = 'none';
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        overlay.remove();
    };
    topBar.appendChild(closeBtn);
    gui.appendChild(topBar);

    // Search input
    const searchDiv = document.createElement('div');
    searchDiv.style.marginBottom = '10px';
    searchDiv.innerHTML = `
        <label>Enter text to find on page:<br>
            <input id="search-text" type="text" style="width:100%;margin-top:4px;background:#181818;color:#fff;border:1px solid #444;padding:7px 10px;border-radius:6px;font-size:15px;outline:none;transition:border-color 0.2s;">
        </label>
        <button id="search-btn" style="margin-left:8px;margin-top:8px;">Highlight</button>
        <button id="clear-btn" style="margin-left:8px;margin-top:8px;">Clear</button>
    `;
    gui.appendChild(searchDiv);

    // Specificity controls
    const controlsDiv = document.createElement('div');
    controlsDiv.style.margin = '10px 0 10px 0';
    controlsDiv.style.display = 'flex';
    controlsDiv.style.gap = '16px';
    controlsDiv.innerHTML = `
        <label>Specificity:
            <select id="search-specificity" style="background:#181818;color:#fff;border:1px solid #444;padding:4px 8px;border-radius:5px;">
                <option value="id">ID</option>
                <option value="class">Class</option>
                <option value="full">Full Path</option>
            </select>
        </label>
    `;
    gui.insertBefore(controlsDiv, searchDiv);
    let searchSpec = 'class';
    gui.querySelector('#search-specificity').onchange = e => { searchSpec = e.target.value; };
    gui.querySelector('#search-specificity').value = searchSpec;

    // Selector type controls (CV, Odds, Value)
    const typeDiv = document.createElement('div');
    typeDiv.style.margin = '10px 0 0 0';
    typeDiv.style.display = 'flex';
    typeDiv.style.gap = '16px';
    typeDiv.innerHTML = `
        <label><input type="radio" name="selector-type" value="cv" checked> CV</label>
        <label><input type="radio" name="selector-type" value="odds"> Odds</label>
        <label><input type="radio" name="selector-type" value="value"> Value</label>
    `;
    gui.insertBefore(typeDiv, controlsDiv);
    let selectorType = 'cv';
    typeDiv.querySelectorAll('input[name="selector-type"]').forEach(radio => {
        radio.onchange = e => { selectorType = e.target.value; updateResults(); };
    });

    // Results
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'search-results';
    resultsDiv.style.marginTop = '10px';
    resultsDiv.style.fontSize = '13px';
    gui.appendChild(resultsDiv);

    // LCD/Keep controls
    const lcdDiv = document.createElement('div');
    lcdDiv.style.margin = '10px 0 0 0';
    lcdDiv.innerHTML = `
        <label><input type="checkbox" id="multi-example-mode"> Multiple selector examples / LCD</label>
        <button id="keep-example" style="margin-left:8px;">Keep This Example</button>
        <button id="clear-examples" style="margin-left:8px;">Clear Examples</button>
    `;
    gui.insertBefore(lcdDiv, resultsDiv);

    // Save LCD selector to selected type
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save LCD Selector to Selected Type';
    saveBtn.style.background = 'linear-gradient(90deg,#1976d2 60%,#0d47a1 100%)';
    saveBtn.style.color = '#fff';
    saveBtn.style.border = '1px solid #1976d2';
    saveBtn.style.borderRadius = '6px';
    saveBtn.style.padding = '8px 16px';
    saveBtn.style.fontWeight = 'bold';
    saveBtn.style.fontSize = '15px';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.boxShadow = '0 1px 4px #0004';
    saveBtn.style.marginTop = '10px';
    gui.appendChild(saveBtn);

    // Save Current Selector to selected type
    const saveCurrentBtn = document.createElement('button');
    saveCurrentBtn.textContent = 'Save Current Selector to Selected Type';
    saveCurrentBtn.style.background = 'linear-gradient(90deg,#388e3c 60%,#1b5e20 100%)';
    saveCurrentBtn.style.color = '#fff';
    saveCurrentBtn.style.border = '1px solid #388e3c';
    saveCurrentBtn.style.borderRadius = '6px';
    saveCurrentBtn.style.padding = '8px 16px';
    saveCurrentBtn.style.fontWeight = 'bold';
    saveCurrentBtn.style.fontSize = '15px';
    saveCurrentBtn.style.cursor = 'pointer';
    saveCurrentBtn.style.boxShadow = '0 1px 4px #0004';
    saveCurrentBtn.style.marginTop = '10px';
    saveCurrentBtn.style.marginLeft = '10px';
    gui.appendChild(saveCurrentBtn);

    // Export selectors button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export Current Selectors';
    exportBtn.style.background = 'linear-gradient(90deg,#ff9800 60%,#f57c00 100%)';
    exportBtn.style.color = '#fff';
    exportBtn.style.border = '1px solid #ff9800';
    exportBtn.style.borderRadius = '6px';
    exportBtn.style.padding = '8px 16px';
    exportBtn.style.fontWeight = 'bold';
    exportBtn.style.fontSize = '15px';
    exportBtn.style.cursor = 'pointer';
    exportBtn.style.boxShadow = '0 1px 4px #0004';
    exportBtn.style.marginTop = '10px';
    exportBtn.style.marginLeft = '10px';
    gui.appendChild(exportBtn);

    // Modal for export/edit
    const modalBg = document.createElement('div');
    modalBg.style.position = 'fixed';
    modalBg.style.left = '0';
    modalBg.style.top = '0';
    modalBg.style.width = '100vw';
    modalBg.style.height = '100vh';
    modalBg.style.background = 'rgba(0,0,0,0.35)';
    modalBg.style.zIndex = 1000000;
    modalBg.style.display = 'none';
    modalBg.style.justifyContent = 'center';
    modalBg.style.alignItems = 'center';
    modalBg.style.pointerEvents = 'auto';

    const modal = document.createElement('div');
    modal.style.background = '#232323';
    modal.style.color = '#fff';
    modal.style.padding = '28px 32px';
    modal.style.borderRadius = '12px';
    modal.style.boxShadow = '0 2px 16px #000a';
    modal.style.minWidth = '340px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '18px';
    modal.innerHTML = `
        <div style='font-size:18px;font-weight:bold;margin-bottom:8px;'>Export/Edit Selectors for this Site</div>
        <label>CV Selector:<br><input id='edit-cv' type='text' style='width:100%;margin-top:4px;background:#181818;color:#fff;border:1px solid #444;padding:7px 10px;border-radius:6px;font-size:15px;'></label>
        <label>Odds Selector:<br><input id='edit-odds' type='text' style='width:100%;margin-top:4px;background:#181818;color:#fff;border:1px solid #444;padding:7px 10px;border-radius:6px;font-size:15px;'></label>
        <label>Value Selector:<br><input id='edit-value' type='text' style='width:100%;margin-top:4px;background:#181818;color:#fff;border:1px solid #444;padding:7px 10px;border-radius:6px;font-size:15px;'></label>
        <div style='display:flex;gap:16px;justify-content:flex-end;margin-top:10px;'>
            <button id='export-save' style='background:#388e3c;color:#fff;border:1px solid #388e3c;border-radius:6px;padding:8px 16px;font-weight:bold;font-size:15px;cursor:pointer;'>Save</button>
            <button id='export-cancel' style='background:#b71c1c;color:#fff;border:1px solid #b71c1c;border-radius:6px;padding:8px 16px;font-weight:bold;fontSize:15px;cursor:pointer;'>Cancel</button>
        </div>
    `;
    modalBg.appendChild(modal);
    document.body.appendChild(modalBg);

    exportBtn.onclick = function() {
        // Fill fields with current selectors
        modal.querySelector('#edit-cv').value = savedSelectors.cv || '';
        modal.querySelector('#edit-odds').value = savedSelectors.odds || '';
        modal.querySelector('#edit-value').value = savedSelectors.value || '';
        modalBg.style.display = 'flex';
    };
    modal.querySelector('#export-cancel').onclick = function() {
        modalBg.style.display = 'none';
    };
    modal.querySelector('#export-save').onclick = function() {
        // Save to chrome.storage.local as selectorList entries (used by Manage Selectors)
        const cv = modal.querySelector('#edit-cv').value.trim();
        const odds = modal.querySelector('#edit-odds').value.trim();
        const value = modal.querySelector('#edit-value').value.trim();
        savedSelectors.cv = cv;
        savedSelectors.odds = odds;
        savedSelectors.value = value;
        const site = location.hostname;
        // Prepare selector objects for Manage Selectors (type: odds/value/compared)
        const selectorsToSave = [];
        if (odds) selectorsToSave.push({ site, type: 'odds', selector: odds });
        if (value) selectorsToSave.push({ site, type: 'value', selector: value });
        if (cv) selectorsToSave.push({ site, type: 'compared', selector: cv });
        // Save to chrome.storage.local (append, avoid exact duplicates)
        if (window.chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get({ selectorList: [] }, function(data) {
                let list = Array.isArray(data.selectorList) ? data.selectorList : [];
                selectorsToSave.forEach(selObj => {
                    if (!list.some(e => e.site === selObj.site && e.type === selObj.type && e.selector === selObj.selector)) {
                        list.push(selObj);
                    }
                });
                chrome.storage.local.set({ selectorList: list }, function() {
                    updateSelectorSummary();
                    modalBg.style.display = 'none';
                    alert('Selectors saved and integrated for this site!');
                });
            });
        } else {
            // Fallback: localStorage (legacy, not used by Manage Selectors)
            try {
                const key = 'selectors_' + site;
                localStorage.setItem(key, JSON.stringify({cv, odds, value}));
            } catch (e) {}
            updateSelectorSummary();
            modalBg.style.display = 'none';
            alert('Selectors saved for this site (local only)!');
        }
    };

    // Store selectors for each type
    let savedSelectors = { cv: '', odds: '', value: '' };

    saveBtn.onclick = function() {
        let lcd = '';
        if (multiExampleMode && exampleSelectors.length > 1) {
            lcd = getCommonDenominator(exampleSelectors);
        } else if (foundElements[0]) {
            lcd = getSelectorForElement(foundElements[0]);
        }
        if (!lcd) {
            alert('No selector to save.');
            return;
        }
        savedSelectors[selectorType] = lcd;
        updateSelectorSummary();
        alert('Selector saved to ' + selectorType.toUpperCase());
    };

    saveCurrentBtn.onclick = function() {
        if (!foundElements.length) {
            alert('No current selector to save.');
            return;
        }
        const sel = getSelectorForElement(foundElements[currentIndex]);
        if (!sel) {
            alert('No selector to save.');
            return;
        }
        savedSelectors[selectorType] = sel;
        updateSelectorSummary();
        alert('Current selector saved to ' + selectorType.toUpperCase());
    };

    // Toggleable textbox for all selectors and their matches
    const summaryToggleBtn = document.createElement('button');
    summaryToggleBtn.textContent = 'Show/Hide Saved Selectors';
    summaryToggleBtn.style.margin = '12px 0 0 0';
    summaryToggleBtn.style.padding = '6px 14px';
    summaryToggleBtn.style.background = '#333';
    summaryToggleBtn.style.color = '#fff';
    summaryToggleBtn.style.border = '1px solid #444';
    summaryToggleBtn.style.borderRadius = '6px';
    summaryToggleBtn.style.cursor = 'pointer';
    gui.appendChild(summaryToggleBtn);

    const summaryBox = document.createElement('textarea');
    summaryBox.style.width = '100%';
    summaryBox.style.height = '120px';
    summaryBox.style.marginTop = '8px';
    summaryBox.style.display = 'none';
    summaryBox.style.background = '#181818';
    summaryBox.style.color = '#fff';
    summaryBox.style.border = '1px solid #444';
    summaryBox.style.borderRadius = '6px';
    summaryBox.readOnly = true;
    gui.appendChild(summaryBox);

    summaryToggleBtn.onclick = function() {
        summaryBox.style.display = summaryBox.style.display === 'none' ? 'block' : 'none';
        if (summaryBox.style.display === 'block') updateSelectorSummary();
    };

    function updateSelectorSummary() {
        let txt = '';
        ['cv','odds','value'].forEach(type => {
            const sel = savedSelectors[type];
            let matches = [];
            if (sel) {
                try {
                    matches = Array.from(document.querySelectorAll(sel));
                } catch (e) {}
            }
            txt += type.toUpperCase() + ':\n';
            txt += (sel ? sel : '(none)') + '\n';
            txt += 'Matches (' + matches.length + '):\n';
            matches.forEach((el, i) => {
                let txtContent = (el.textContent || '').trim().replace(/\s+/g, ' ');
                txt += '[' + (i+1) + '] ' + (txtContent.slice(0, 80) || '(no text)') + (txtContent.length > 80 ? '...' : '') + '\n';
            });
            txt += '\n';
        });
        summaryBox.value = txt;
    }

    overlay.appendChild(gui);
    document.body.appendChild(overlay);

    let highlights = [];
    let foundElements = [];
    let currentIndex = 0;
    let multiExampleMode = false;
    let exampleSelectors = [];

    function clearHighlights() {
        highlights.forEach(el => el.remove());
        highlights = [];
    }

    function highlightCurrentElement() {
        clearHighlights();
        if (foundElements.length === 0) return;
        const el = foundElements[currentIndex];
        const rect = el.getBoundingClientRect();
        const hl = document.createElement('div');
        hl.style.position = 'fixed';
        hl.style.left = rect.left + 'px';
        hl.style.top = rect.top + 'px';
        hl.style.width = rect.width + 'px';
        hl.style.height = rect.height + 'px';
        hl.style.background = '#4caf50';
        hl.style.opacity = '0.25';
        hl.style.zIndex = 999998;
        hl.style.pointerEvents = 'none';
        hl.textContent = (currentIndex + 1);
        hl.style.color = '#fff';
        hl.style.fontWeight = 'bold';
        hl.style.fontSize = '18px';
        hl.style.display = 'flex';
        hl.style.alignItems = 'center';
        hl.style.justifyContent = 'center';
        document.body.appendChild(hl);
        highlights.push(hl);
    }

    function getSelectorForElement(el) {
        if (searchSpec === 'id' && el.id && !/^:r\d+:$/.test(el.id) && !/^(:[a-zA-Z0-9]+)+$/.test(el.id)) {
            return '#' + CSS.escape(el.id);
        }
        if (searchSpec === 'class' && el.className && typeof el.className === 'string') {
            const classes = el.className.trim().split(/\s+/).join('.');
            if (classes) return el.tagName.toLowerCase() + '.' + classes;
        }
        // 'full' mode: tag + nth-of-type path
        let path = [];
        let node = el;
        while (node && node.nodeType === 1 && node !== document.body) {
            let name = node.tagName.toLowerCase();
            let parent = node.parentNode;
            if (!parent) break;
            let siblings = Array.from(parent.children).filter(n => n.tagName === node.tagName);
            if (siblings.length > 1) {
                let idx = siblings.indexOf(node) + 1;
                name += `:nth-of-type(${idx})`;
            }
            path.unshift(name);
            node = parent;
        }
        return path.length ? path.join(' > ') : null;
    }

    function getCommonDenominator(selectors) {
        if (!selectors.length) return '';
        const split = selectors.map(sel => sel.split(' > '));
        const minLen = Math.min(...split.map(arr => arr.length));
        let result = [];
        for (let i = 0; i < minLen; i++) {
            const parts = split.map(arr => arr[i]);
            if (parts.every(p => p === parts[0])) {
                result.push(parts[0]);
            } else {
                const nths = parts.map(p => p.match(/:nth-of-type\((\d+)\)/));
                if (nths.every(n => n)) {
                    const tag = parts[0].replace(/:nth-of-type\((\d+)\)/, '');
                    result.push(tag + ':nth-of-type(n)');
                } else {
                    result.push(parts[0].replace(/:nth-of-type\((\d+)\)/, ''));
                }
            }
        }
        return result.join(' > ');
    }

    function updateResults() {
        if (foundElements.length === 0) {
            resultsDiv.innerHTML = '<span style="color:#aaa">No matches found.</span>';
            return;
        }
        const el = foundElements[currentIndex];
        const sel = getSelectorForElement(el);
        let mainSelector = sel;
        let multiInfo = '';
        if (multiExampleMode) {
            multiInfo = `<div style='margin-bottom:6px;color:#ffb300;'>Kept examples: ${exampleSelectors.length}</div>`;
            if (exampleSelectors.length > 1) {
                const common = getCommonDenominator(exampleSelectors);
                mainSelector = common;
                multiInfo += `<div style='margin-bottom:6px;color:#4caf50;'>LCD:<br><span style='word-break:break-all;'>${common}</span></div>`;
            }
        }
        resultsDiv.innerHTML =
            multiInfo +
            `<div style='margin-bottom:6px;'>[${currentIndex+1} of ${foundElements.length}] <span style='color:#4caf50'>${sel}</span> <button id='copy-btn'>Copy</button></div>` +
            `<div style='margin-bottom:6px;'>` +
            `<button id='prev-btn' ${currentIndex===0?'disabled':''}>Previous</button>` +
            `<button id='next-btn' ${currentIndex===foundElements.length-1?'disabled':''} style='margin-left:8px;'>Next</button>` +
            `</div>`;
        // Copy button
        const copyBtn = resultsDiv.querySelector('#copy-btn');
        copyBtn.onclick = function() {
            navigator.clipboard.writeText(mainSelector);
            copyBtn.textContent = 'Copied!';
            setTimeout(()=>copyBtn.textContent='Copy', 1000);
        };
        // Prev/Next
        const prevBtn = resultsDiv.querySelector('#prev-btn');
        const nextBtn = resultsDiv.querySelector('#next-btn');
        if (prevBtn) prevBtn.onclick = function() {
            if (currentIndex > 0) {
                currentIndex--;
                highlightCurrentElement();
                updateResults();
            }
        };
        if (nextBtn) nextBtn.onclick = function() {
            if (currentIndex < foundElements.length-1) {
                currentIndex++;
                highlightCurrentElement();
                updateResults();
            }
        };
    }

    gui.querySelector('#search-btn').onclick = function() {
        const text = gui.querySelector('#search-text').value.trim();
        if (!text) return;
        // Match any element whose textContent includes the search string
        foundElements = Array.from(document.querySelectorAll('body *')).filter(el => {
            return el.textContent && el.textContent.trim().includes(text);
        });
        currentIndex = 0;
        highlightCurrentElement();
        updateResults();
    };
    gui.querySelector('#clear-btn').onclick = function() {
        clearHighlights();
        foundElements = [];
        currentIndex = 0;
        updateResults();
    };
    gui.querySelector('#multi-example-mode').onchange = e => {
        multiExampleMode = e.target.checked;
        updateResults();
    };
    gui.querySelector('#keep-example').onclick = function() {
        if (!foundElements.length) return;
        const sel = getSelectorForElement(foundElements[currentIndex]);
        if (!exampleSelectors.includes(sel)) {
            exampleSelectors.push(sel);
        }
        updateResults();
    };
    gui.querySelector('#clear-examples').onclick = function() {
        exampleSelectors = [];
        updateResults();
    };
    // Initial
    updateResults();
})();
