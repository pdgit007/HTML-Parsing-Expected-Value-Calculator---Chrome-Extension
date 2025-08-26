(function() {
    // ===== SELECTORS SECTION =====
    // Button selectors
    const infoButtonSelectors = [
        // KEY-DROP
        'button.show-odds',
        'button[data-action="show-odds"]',
        // FARM.SKINS
        '#main-view > div > div.container > section.mb-\\[5\\.4rem\\].\\[content-visibility\\:auto\\] > ul > li > div > div.flex.items-start.justify-between.p-3.pb-0 > button > div',
        '#__next > div > div.MuiBox-root.css-aqzh27 > div > div > div > div > div.MuiBox-root.css-8atqhb > div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-1.css-tuxzvu > div > a > div > div > div > div.MuiBox-root.css-69i1ev > button > svg > path',
        // HELLCASE info buttons (all variants)
        'i._base_9pu4z_1.icon-inform.item-wrap__button--img--new',
        '#main-content > div.page-container > div._base_q0sc6_1 > div._listContainer_1fio7_42 > div:nth-child(2) > div > section > section > div > a:nth-child(n) > div.item-wrap__short-info > div.item-wrap__button.inform-preset > i',
        // HELLCASE info button container div
        '#main-content > div.page-container > div._base_q0sc6_1 > div._listContainer_1fio7_42 > div:nth-child(2) > div > section > section > div > a:nth-child(n) > div.item-wrap__short-info > div.item-wrap__button.inform-preset',
        // NEW: Bloodycase.com info button
        'button.client-item__toggle',
        // JEMLIT: select all, filter by text below
        'button.btn.btn-tertiary.btn-sm',
        // mysteryopening.com SHOW DETAILS button (only this specific button)
        'body > div.layout.flex.flex-col.bg-neutral-700 > main > div.content-inner > div > div > div > div.flex.flex-col.gap-4.lg\\:p-2 > div.flex.items-center.justify-between.mx-2 > button > span',
        // NEW: Button with specific SVG path (provided example)
        'button svg[path][d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"]',
        // NEW: SVG icon with specific path anywhere in DOM
        'svg[data-icon="circle-info"] > path[d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"]',
        'svg.fa-circle-info > path[d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"]',
        // NEW: BountyStars.com "Unstack" button
        'label._checkbox_1o74f_189',
        // NEW: See box details button (MainButton)
        'div.MainButton_wrapper__trPs_.MainButton_wrapper_isSecondary__YNVHr > span.MainButton_label__WzY3u',
        // datdrop
        '#root > div > main > div > div._D2xP8VjFpBtPUF0aPj9c > section > div._wxYRSiwsmhm6eBo9q7cg > button'
    ].join(', ');

    // Odds, value, and compared selectors will be loaded dynamically
    let oddsSelector = null;
    let valueSelector = null;
    let comparedSelector = null;

    // Utility to get selectors for current site (new format)
    function getSiteSelectors(callback) {
        const site = location.hostname;
        chrome.storage.local.get({ selectorList: [] }, function(data) {
            const list = Array.isArray(data.selectorList) ? data.selectorList : [];
            // Filter for current site
            const siteSelectors = list.filter(sel => sel.site === site);
            // Find the most recent of each type
            let odds = null, value = null, compared = null;
            for (let i = siteSelectors.length - 1; i >= 0; i--) {
                const sel = siteSelectors[i];
                if (!odds && sel.type === 'odds') odds = sel.selector;
                if (!value && sel.type === 'value') value = sel.selector;
                if (!compared && sel.type === 'compared') compared = sel.selector;
                if (odds && value && compared) break;
            }
            callback({ odds, value, compared });
        });
    }

    // ===== BUTTON FUNCTIONALITY SECTION =====
    chrome.storage.local.get(['autoClickOdds'], function(result) {
        if (result.autoClickOdds) {
            document.querySelectorAll(infoButtonSelectors).forEach(el => {
                if (
                    el.matches('body > div.layout.flex.flex-col.bg-neutral-700 > main > div.content-inner > div > div > div > div.flex.flex-col.gap-4.lg\\:p-2 > div.flex.items-center.justify-between.mx-2 > button > span') &&
                    el.textContent.trim().toUpperCase().includes('SHOW DETAILS')
                ) {
                    el.parentElement.click();
                    return;
                }
                if (
                    el.matches('button.btn.btn-tertiary.btn-sm') &&
                    !el.textContent.trim().toLowerCase().includes('show chances')
                ) {
                    return;
                }
                if (
                    el.matches('button:has(span.typo-button)')
                ) {
                    const span = el.querySelector('span.typo-button');
                    if (span && span.textContent.trim().toUpperCase().includes('SHOW DETAILS')) {
                        el.click();
                        return;
                    }
                }
                if (
                    el.tagName === 'path' &&
                    el.getAttribute('d') === 'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z'
                ) {
                    let clickable = el.closest('button, a, li, div');
                    if (clickable && typeof clickable.click === 'function') {
                        clickable.click();
                        return;
                    }
                }
                let btn = el;
                if (btn.tagName.toLowerCase() !== 'button' && btn.tagName.toLowerCase() !== 'label') {
                    const closestBtn = btn.closest('button, label');
                    if (closestBtn) btn = closestBtn;
                }
                // Prevent clicking Login button (or any button/label/span with text 'Login')
                const btnText = (btn.textContent || '').trim().toLowerCase();
                if (btnText === 'login' || btnText.includes('login')) return;
                // Click if it's a button, label, or has the item-wrap__button class
                if ((btn.tagName.toLowerCase() === 'button' || btn.tagName.toLowerCase() === 'label' || btn.classList.contains('item-wrap__button')) && !btn.disabled) btn.click();
                // Special handling for 'See box details' button ONLY (not Login or others)
                if (
                    el.matches('div.MainButton_wrapper__trPs_.MainButton_wrapper_isSecondary__YNVHr > span.MainButton_label__WzY3u')
                ) {
                    const label = el.textContent.trim().toLowerCase();
                    if (label === 'see box details') {
                        // Click the parent div (the actual button)
                        const parentDiv = el.closest('div.MainButton_wrapper__trPs_');
                        if (parentDiv && typeof parentDiv.click === 'function') {
                            parentDiv.click();
                            return;
                        }
                    }
                    // Do NOT click for 'login' or any other label
                }
            });
            setTimeout(runScrapeWithSelectors, 1000); // Adjust delay as needed
        } else {
            runScrapeWithSelectors();
        }
    });

    function runScrapeWithSelectors() {
        getSiteSelectors(function(selectors) {
            if (!selectors) return;
            oddsSelector = selectors.odds;
            valueSelector = selectors.value;
            comparedSelector = selectors.compared;
            scrapeOdds();
        });
    }

    function scrapeOdds() {
        // --- Compared Value ---
        const comparedElement = document.querySelector(comparedSelector);
        const compared = (() => {
            if (!comparedElement) return null;
            // Remove all commas for easier parsing of thousands
            const text = comparedElement.textContent.trim().replace(/,/g, '');
            // Try to extract a price in parentheses, e.g. ($86.15)
            const match = text.match(/\(\s*\$?([0-9.]+)\s*\)/);
            if (match) {
                return parseFloat(match[1]);
            }
            // Fallback: extract the first number (handles "Open 1 for $67085.93" or "40085.93")
            const firstNumber = text.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (firstNumber) {
                return parseFloat(firstNumber[1]);
            }
            return null;
        })();

        // --- Odds ---
        const oddElements = document.querySelectorAll(oddsSelector);
        const odds = Array.from(oddElements).map((el, index) => {
            const text = el.textContent.trim();
            // Only parse if there is a valid number, otherwise skip (do not return 0)
            const match = text.match(/([0-9]*\.?[0-9]+)/);
            if (!match) {
                // console.warn(`No valid number in odds at index ${index + 1}:`, text);
                return null;
            }
            const parsed = parseFloat(match[1]);
            if (isNaN(parsed)) {
                // console.warn(`NaN encountered in odds at index ${index + 1}:`, text);
                return null;
            }
            return parsed / 100;
        }).filter(v => v !== null);

        // --- Values ---
        const valueElements = document.querySelectorAll(valueSelector);
        const values = Array.from(valueElements).map((el, index) => {
            let text = Array.from(el.childNodes).map(n => n.textContent).join('').trim();
            // Remove all commas for easier parsing of thousands
            text = text.replace(/,/g, '');
            // Updated regex to match numbers with optional decimal part
            const match = text.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!match) {
                // console.warn(`No valid number in values at index ${index + 1}:`, text);
                return null;
            }
            const parsed = parseFloat(match[1]);
            if (isNaN(parsed)) {
                // console.warn(`NaN encountered in values at index ${index + 1}:`, text);
                return null;
            }
            return parsed;
        }).filter(v => v !== null);

        // ===== CALCULATION SECTION =====
        let expectedValue = 0;
        if (odds.length === values.length) {
            for (let i = 0; i < odds.length; i++) {
                expectedValue += odds[i] * values[i];
            }
        } else {
            // console.error("Odds and values arrays are not of the same length.");
        }

        const result = {
            compared,
            odds,
            values,
            expectedValue,
            comparison: compared !== null ? (expectedValue > compared ? 'greater' : 'less or equal') : 'N/A'
        };

        chrome.runtime.sendMessage({ action: 'parsedData', data: result });
    }
})();
