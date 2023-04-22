// Import the IPC
const electron = require('electron');
const fs = require('fs');
const path = require('path');
const ipc = electron.ipcRenderer;

// ================================================================================================================================================
// Object to hold all the ads we scanned
let scannedAds = [];
// ================================================================================================================================================
// Object to hold all the dynamic paramters of Yad2
// If Yad2 will change selectors or URL, we'll just update them here in one centralized place
const y2Params = {
  homePageUrl: 'https://www.yad2.co.il/',
  nadlanSaleUrl: 'https://www.yad2.co.il/realestate/forsale?page=',
  // === Common Selectors === //
  nadlanLinkSelector: '#__next > div > main > div.container_container___lb15 > section:nth-child(2) > main > div > div > ul > li:nth-child(1) > a',
  nadlanListAdSelector: '#__layout > div > main > div > div.main_body > div.inner_content.reverse > div > div.feed_list > .feeditem.table',
  maxNadlanListPageToScan: 10,  // ==> MAX_PAGES
  maxNadlanListAdsToScan: 10,   // ==> MAX_ADS_PER_PAGE
  nadlanAdBackSelector: '#__layout > div > header > nav > div.div_sticky_left > i',
  nadlanShowPhoneSelector: '#overlay_comp > section > div > div.main_adPage > div.content_wrapper > div > div.ad_page_footer > div > button:nth-child(1)',
  nadlanNextPageSelector: '#__layout > div > main > div > div.main_body > div.pagination.clickable > a.internalLink.no-button.pagination-nav.text.active',
  //=== Ad Selectors === ///
  adUpdateDateSelector: '#overlay_comp > section > div > div.main_adPage > div.content_wrapper > div > div.top_components > div > div > div.content > div.top > span.left',
  adServiceTypeSelector: '#overlay_comp > section > div > div.main_adPage > div.content_wrapper > div > div.top_components > div > div > div.content > div.top > span.right',
  adNehesCitySelector: '#overlay_comp > section > div > div.main_adPage > div.content_wrapper > div > div.top_components > div > div > div.content > div.main_content > div > span',
  adPriceSelector: '#overlay_comp > section > div > div.main_adPage > div.content_wrapper > div > div.top_components > div > div > div.content > div.main_content > div > strong',
  adRoomsSelector: '#overlay_comp > section > div > div.main_adPage > div.content_wrapper > div > div.top_components > div > div > div.content > div.main_content > div > div > dl.cell.rooms-item > dd',
  adFloorSelector: '#overlay_comp > section > div > div.main_adPage > div.content_wrapper > div > div.top_components > div > div > div.content > div.main_content > div > div > dl.cell.floor-item > dd',
  adSizeMrSelector: '#overlay_comp > section > div > div.main_adPage > div.content_wrapper > div > div.top_components > div > div > div.content > div.main_content > div > div > dl.cell.SquareMeter-item > dd',
  adAboutSelector: '#adpage_education-content > div:nth-child(1) > div > div.show_more.content > div > p',
  adNameSelector: '#overlay_comp > section > div > div.seller > span.name',
  adPhoneSelector: '#overlay_comp > section > div > div.middle_line > div:nth-child(1) > a > span',
  adImageSelector: '#overlay_comp > section > div > div.main_adPage > div.content_wrapper > div > div.top_components > div > div > div.img_container.has_images > div.swiper-container.image-swiper.swiper-container-initialized.swiper-container-horizontal.swiper-container-ios > div.swiper-wrapper > div.swiper-slide.swiper-slide-active',
};
// ================================================================================================================================================

// Objects for scraping
let wasLoadedOnce = false;
let y2Window = null;
let isScraping = false;
let currPage = 0;

// Function to hangle the main log in the app window
const debugText = (strText) => {
  debugData = document.getElementById('debug-data');
  debugData.innerText = strText + '\n' + debugData.innerText;
  debugData.innerText = debugData.innerText.substring(0, 10000);
}

// ==== Dashboard buttons behavior ====

// "Close the app" button behavior
const closeApp = (e) => {
  debugText('Closing the y2-scanner app ...');
  ipc.send('close-app');
};

// "Export to CSV" button behavior
const exportToCSV = (e) => {
  debugText('Exporting currently scanned ads to CSV ...');
  // Create the CSV string from scanned ads
  let csv = '"ad_url","ad_id","ad_path","update_date","service_type","nehes_city","price","rooms","floor","size_mr","name","phone","about","image"';
  for (let adIndex = 0 ; adIndex < scannedAds.length ; adIndex++) {
    const ad = scannedAds[adIndex];
    if (ad.ad_id) {
      csv += '\n';
      csv += '"'+ad.ad_url.split('"').join('\"')+'"'
            +',"'+ad.ad_id.split('"').join('\"')+'"'
            +',"'+ad.ad_path.split('"').join('\"')+'"'
            +',"'+ad.update_date.split('"').join('\"')+'"'
            +',"'+ad.service_type.split('"').join('\"')+'"'
            +',"'+ad.nehes_city.split('"').join('\"')+'"'
            +',"'+ad.price.split('"').join('\"')+'"'
            +',"'+ad.rooms.split('"').join('\"')+'"'
            +',"'+ad.floor.split('"').join('\"')+'"'
            +',"'+ad.size_mr.split('"').join('\"')+'"'
            +',"'+ad.name.split('"').join('\"')+'"'
            +',"'+ad.phone.split('"').join('\"')+'"'
            +',"'+ad.about.split('"').join('\"')+'"'
            +',"'+(ad.image ? ad.image.split('"').join('\"') : '')+'"'
            ;
    }
  }
  fs.writeFileSync(path.join(__dirname, 'scanned_ads.csv'), "\ufeff" + csv, 'utf8');
  alert('The CSV file has been saved'+'\n'+'to the same folder'+'\n'+'that you were running the app from.')
};

// "Start scraping" button behavior
const y2Scraping = (e) => {
  // turn on the flag
  isScraping = true;
  // ==> If webview still isn't loaded
  if (!(y2Window)) {
    console.log('not y2Window', y2Window);
    isScraping = false;
    alert('Please wait to the app window to be fully loaded before scraping!');
    return;
  }
  // Load the yad2 homepage
  try {
    y2Window.loadURL(y2Params.homePageUrl);
  } catch(err) {
    // ==> If got an error, maybe clicked too early
    console.log('y2Window error', err.message);
    isScraping = false;
    alert('Please wait to the app window to be fully loaded before scraping!');
  }

  // Do not allow more button clicks till the end of the scraping
  document.getElementById("start-scraping").disabled = true;
};

// ==== Webview events ====

// Webview event of start loading page
const y2LoadStart = (e) => {
  if (isScraping) {
    debugText('');
    debugText('Loading ...');
  }
};

// Webview event of finish loading page
const y2LoadFinish = (e) => {
  if (isScraping) {
    debugText(e.target.src+' loaded.');
    debugText('');
  }
};

// Webview has sent a message through the IPC
const hadleY2WindowMessage = (e) => {
  // extract the event message
  const event = e.channel;
  const message = e.args[0];
  const messageAsText = JSON.stringify(message);
  console.log('y2Window message', event, message);
  // If valid
  if (event && message) {
    const messageAsText = JSON.stringify(message);
    // If not blank
    if (messageAsText.indexOf('"location":"about:blank"') <= -1) {
      debugText('');
      debugText('event = ' + event);
      // Handle JSON/Text message types
      if (message.title && message.location && message.html) {
        debugText('title = ' + message.title);
        debugText('url = ' + message.location);
        debugText('');
      } else {
        //debugText('');
        //debugText('message = ' + messageAsText);
        //debugText('');
      }
      // If captcha
      if (event === 'webview_data' && (message.location.indexOf('https://validate') > -1 || message.title.indexOf('Captcha') > -1 || message.title.indexOf('ShieldSquare') > -1)) {
        window.setTimeout(()=>{
          debugText('!!! Got navigation captcha, waiting for the user to complete the captcha !!!');
        }, 1500);
      }
      // For homepage, click on "nadlan" button
      else if (event === 'webview_data' && message.location === 'https://www.yad2.co.il/') {
        window.setTimeout(()=>{
          debugText('Clicking on "Nadlan" button ...');
          currPage = 1;
          y2Window.send("click_webview_on_nadlan", y2Params);
        }, 3000);
      }
      // For nadlan page, start scraping ads sequentially
      else if (event === 'webview_data' && (
           message.location === 'https://www.yad2.co.il/realestate/forsale' 
        || message.location === 'https://www.yad2.co.il/realestate/forrent'
        || message.location.indexOf("https://www.yad2.co.il/realestate/forsale?page=") > -1
        || message.location.indexOf("https://www.yad2.co.il/realestate/forrent?page=") > -1
        )) {
        window.setTimeout(()=>{
          // If not finished the page ==> get more ads
          debugText('Staring scraping ads!');
          y2Window.send("start_webview_list_scraping", y2Params);
        }, 3000);
      }
      // If not a regular behavior, start from the beginning
      else if (event === 'webview_data') {
        y2Scraping();
      }
      // Got scanned ad data
      else if (event === 'ad_data') {
        window.setTimeout(()=>{
          // If not finished the page ==> get more ads
          debugText('');
          debugText('Ad adata' + '\n' + JSON.stringify(message));
          debugText('');
          // TODO: ... save to db ... , currently saving to the memory
          if (message && message.ad_id) {
            // if already exist, just update
            const found_existing = false;
            for (let adIndex = 0 ; adIndex < scannedAds.length ; adIndex++) {
              if (scannedAds[adIndex].ad_id === message.ad_id) {
                found_existing = true;
                scannedAds[adIndex] = message;
                break;
              }
            }
            // if new, add to memory
            if (!found_existing) {
              scannedAds.push(message);
            }
          }
          // Allow export since we have scanned items
          if (scannedAds.length > 0) {
            document.getElementById("export-to-csv").disabled = false;
          } else {
            document.getElementById("export-to-csv").disabled = true;
          }
        }, 3000);
      }
      // Page scan completed
      else if (event === 'page_scan_completed') {
        // Allow export since we have scanned items
        if (scannedAds.length > 0) {
          document.getElementById("export-to-csv").disabled = false;
        } else {
          document.getElementById("export-to-csv").disabled = true;
        }
        // Click on next page
        currPage++;
        if (currPage <= y2Params.maxNadlanListPageToScan) {
          debugText('Clicking on "Next Page" button ...');
          //y2Window.send("click_webview_on_next_page", y2Params);
          y2Window.loadURL(y2Params.nadlanSaleUrl+currPage);
        } else {
          // Exceeded maximum scanning, stop
          document.getElementById("start-scraping").disabled = false;
        }
      }
    }
  }
};

// Initalize the dashboard
window.addEventListener('DOMContentLoaded', () => {
  // Helping function to set some texts
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };
  // Make sure the initialization happens only one time
  if (!wasLoadedOnce) {
    // Set some texts
    for (const type of ['chrome', 'node', 'electron']) {
      console.log(type, process.versions[type]);
      replaceText(`${type}-version`, process.versions[type])
    }
    // Respond to dashboard button clicks
    document.getElementById("btn-close-app").addEventListener("click", closeApp);
    document.getElementById("start-scraping").addEventListener("click", y2Scraping);
    document.getElementById("export-to-csv").addEventListener("click", exportToCSV);
  }
  // Initialize the webview of not already initialized
  if (!y2Window) {
    y2Window = document.getElementById('y2window');
    // Set loading and finish loading listeners
    y2Window.addEventListener('did-start-loading', y2LoadStart)
    y2Window.addEventListener('did-stop-loading', y2LoadFinish);
    // Set document.ready listener
    y2Window.addEventListener("dom-ready", () => {
      console.log('sending get_webview_data');
      y2Window.send("get_webview_data");
    });
    // Set handling message from IPC
    y2Window.addEventListener('ipc-message', hadleY2WindowMessage);
  }
});
