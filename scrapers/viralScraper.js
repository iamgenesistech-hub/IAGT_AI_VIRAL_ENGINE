require('dotenv').config();

const axios = require('axios');

async function testScraper() {
    try {
        console.log("Genesis Viral Scraper Initialized...");

        const response = await axios.get('https://example.com');

        console.log("Website Status:", response.status);
        console.log("Scraper Working Successfully");

    } catch (error) {
        console.error("Scraper Error:", error.message);
    }
}

testScraper();
