require('dotenv').config();

const axios = require('axios');
const viralConfig = require('../configs/viralConfig');

async function testScraper() {
    try {
        console.log("Genesis Viral Scraper Initialized...");
        console.log("Brand:", viralConfig.brandFocus.brandName);
        console.log("Platforms Loaded:", viralConfig.platforms.length);
        console.log("Categories Loaded:", viralConfig.categories.length);
        console.log("Minimum Viral Views:", viralConfig.thresholds.minimumViews);

        const response = await axios.get('https://example.com');

        console.log("Website Status:", response.status);
        console.log("Scraper + Config Connected Successfully");

    } catch (error) {
        console.error("Scraper Error:", error.message);
    }
}

testScraper();