// Wix page code for the Contact Us and Get Involved pages.
// Paste this into the page's code panel (Dev Mode on) on BOTH pages.
// It saves each form submission as a row in the CMS collection "FormSubmissions".
// "#sieloSite" is the ID of the Sielo custom element on the page (set it in the Properties panel).

import wixData from 'wix-data';

$w.onReady(function () {
  const site = $w('#sieloSite');

  site.on('sielo-submit', async (event) => {
    const { id, record } = event.detail;
    try {
      await wixData.insert('FormSubmissions', record);
      site.setAttribute('submit-result', id + ':ok');
    } catch (err) {
      console.error('Sielo form could not be saved', err);
      site.setAttribute('submit-result', id + ':error');
    }
  });
});
