// Import the IPC
const ipc = require('electron').ipcRenderer;

// Respond to webview data requests
ipc.on('get_webview_data', () => {
    // construct the page data object
    const webview_data = {
        title: document.title,
        location: window.location.href,
        html: document.body.outerHTML,
    };
    // return the result
    ipc.sendToHost('webview_data', webview_data);
});

// Click on "nadlan" button
ipc.on('click_webview_on_nadlan', (e, y2Params) => {
    const elmNadlanToClick = document.querySelector(y2Params.nadlanLinkSelector);
    elmNadlanToClick.click();
});

// Click on "next page" button
ipc.on('click_webview_on_next_page', (e, y2Params) => {
    const elmNextPageToClick = document.querySelector(y2Params.nadlanNextPageSelector);
    elmNextPageToClick.click();
});

// Respond to ad list scraping
ipc.on('start_webview_list_scraping', (e, y2Params) => {
    // ========================================
    // ==> uncomment for debugging less than max
    //y2Params.maxNadlanListAdsToScan = 1;
    // ========================================

    // Get all ads on the page
    const arrElmAdsToScan = document.querySelectorAll(y2Params.nadlanListAdSelector);
    // Validate how many ads are on the page and decide the maximum to scan
    const howManyToScan = (arrElmAdsToScan.length && (arrElmAdsToScan.length > y2Params.maxNadlanListAdsToScan)) 
                            ? y2Params.maxNadlanListAdsToScan
                            : (arrElmAdsToScan.length ? arrElmAdsToScan.length : 0);
    // Slice only legit ads
    const arrElmAdsToScanSliced = Array.from(arrElmAdsToScan).slice(0, howManyToScan);
    // Delay before iterating
    window.setTimeout(()=>{
        for (let adIndex = 0 ; adIndex < howManyToScan ; adIndex++) {
            // Iterate each message at her time
            window.setTimeout(()=>{
            arrElmAdsToScanSliced[adIndex].childNodes[0].click();
                window.setTimeout(()=>{
                    // Click the phone button awhile after ad loding
                    const showPhoneBtn = document.querySelector(y2Params.nadlanShowPhoneSelector);
                    showPhoneBtn.click();
                    window.setTimeout(()=>{
                        // Send all the details
                        const update_date = document.querySelector(y2Params.adUpdateDateSelector).innerText.trim();
                        const service_type = document.querySelector(y2Params.adServiceTypeSelector).innerText.trim();
                        const nehes_city = document.querySelector(y2Params.adNehesCitySelector).innerText.trim();
                        const price = document.querySelector(y2Params.adPriceSelector).innerText.trim();
                        const rooms = document.querySelector(y2Params.adRoomsSelector).innerText.trim();
                        const floor = document.querySelector(y2Params.adFloorSelector).innerText.trim();
                        const size_mr = document.querySelector(y2Params.adSizeMrSelector).innerText.trim();
                        const about = document.querySelector(y2Params.adAboutSelector).innerText.trim();
                        const name = document.querySelector(y2Params.adNameSelector).innerText.trim();
                        const phone = document.querySelector(y2Params.adPhoneSelector).innerText.trim();
                        let image = null;
                        try {
                            image = document.querySelector(y2Params.adImageSelector).innerHTML;
                        } catch (e) {}
                        if (image && image.indexOf('src="') > -1) {
                            image = image.split('src="')[1].split('"')[0];
                        }
                        const ad_url = window.location.href;
                        let ad_path = 'forsale';
                        let ad_id = null;
                        if (ad_url.indexOf('open-item-id=') > -1 && ad_url.indexOf('&viewPage') > -1) {
                            ad_id = ad_url.split('open-item-id=')[1].split('&viewPage')[0];
                        }
                        if (ad_url.indexOf('/forrent') > -1) {
                            ad_path = 'forrent';
                        }
                        ipc.sendToHost('ad_data', {
                            update_date, service_type, nehes_city, price, rooms, floor, size_mr, about, name, phone, image, ad_url, ad_id, ad_path
                        });
                    }, 1000);
                    window.setTimeout(()=>{
                        // close phone popup
                        const backBtn = document.querySelector(y2Params.nadlanAdBackSelector);
                        backBtn.click();
                        window.setTimeout(()=>{
                            // get out of the message (if not got out automatically)
                            const backBtn = document.querySelector(y2Params.nadlanAdBackSelector);
                            if (backBtn) {
                                backBtn.click();
                            }
                        }, 3000);
                    }, 5000);
                }, 4000);
            }, adIndex*18000 + 10);
        }
        window.setTimeout(()=>{
            ipc.sendToHost('page_scan_completed', {});
        }, howManyToScan*18000 + 10);
    }, 3000);
});
