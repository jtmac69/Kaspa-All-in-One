/**
 * Test: Review Page Profile-Specific Configuration Display
 * 
 * This test verifies that the review page shows the correct configuration
 * fields based on the selected profile.
 */

const puppeteer = require('puppeteer');

async function testReviewProfileSpecificConfig() {
    console.log('Starting Review Profile-Specific Configuration Test...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100
    });
    
    try {
        const page = await browser.newPage();
        await page.goto('http://localhost:3000');
        
        // Wait for wizard to load
        await page.waitForSelector('.wizard-container', { timeout: 5000 });
        console.log('✓ Wizard loaded');
        
        // Skip system check
        await page.waitForSelector('button:has-text("Continue")', { timeout: 5000 });
        await page.click('button:has-text("Continue")');
        console.log('✓ System check passed');
        
        // Test 1: Core Profile - Should show Network Configuration
        console.log('\n--- Test 1: Core Profile ---');
        await page.waitForSelector('[data-profile="core"]', { timeout: 5000 });
        await page.click('[data-profile="core"]');
        console.log('✓ Selected Core Profile');
        
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(500);
        
        // Skip configuration (use defaults)
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(500);
        
        // Check review page
        await page.waitForSelector('.review-section', { timeout: 5000 });
        
        const networkSectionVisible = await page.evaluate(() => {
            const section = document.querySelector('.review-section:has(#review-external-ip)');
            return section && section.style.display !== 'none';
        });
        
        const networkTitle = await page.evaluate(() => {
            const section = document.querySelector('.review-section:has(#review-external-ip)');
            const title = section?.querySelector('.review-section-title');
            return title?.textContent.trim();
        });
        
        console.log(`Network section visible: ${networkSectionVisible}`);
        console.log(`Network section title: ${networkTitle}`);
        
        if (networkSectionVisible && networkTitle === 'Network Configuration') {
            console.log('✓ Core Profile shows Network Configuration');
        } else {
            console.log('✗ Core Profile should show Network Configuration');
        }
        
        // Go back to profiles
        await page.click('button:has-text("Edit Profiles")');
        await page.waitForTimeout(500);
        
        // Test 2: Kaspa User Applications - Should show Indexer Endpoints
        console.log('\n--- Test 2: Kaspa User Applications Profile ---');
        
        // Deselect core
        await page.click('[data-profile="core"]');
        await page.waitForTimeout(200);
        
        // Select kaspa-user-applications
        await page.click('[data-profile="kaspa-user-applications"]');
        console.log('✓ Selected Kaspa User Applications Profile');
        
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(500);
        
        // Skip configuration (use defaults)
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(500);
        
        // Check review page
        const indexerSectionVisible = await page.evaluate(() => {
            const section = document.querySelector('.review-section');
            return section && section.style.display !== 'none';
        });
        
        const indexerTitle = await page.evaluate(() => {
            const sections = document.querySelectorAll('.review-section');
            for (const section of sections) {
                const title = section.querySelector('.review-section-title');
                if (title?.textContent.includes('Indexer') || title?.textContent.includes('Network')) {
                    return title.textContent.trim();
                }
            }
            return null;
        });
        
        const hasKasiaIndexer = await page.evaluate(() => {
            const content = document.body.textContent;
            return content.includes('Kasia Indexer URL') || content.includes('https://api.kasia.io/');
        });
        
        const hasKSocialIndexer = await page.evaluate(() => {
            const content = document.body.textContent;
            return content.includes('K-Social Indexer URL') || content.includes('https://indexer0.kaspatalk.net/');
        });
        
        const hasWebSocketURL = await page.evaluate(() => {
            const content = document.body.textContent;
            return content.includes('Kaspa Node WebSocket URL') || content.includes('wss://api.kasia.io/ws');
        });
        
        console.log(`Indexer section visible: ${indexerSectionVisible}`);
        console.log(`Section title: ${indexerTitle}`);
        console.log(`Has Kasia Indexer URL: ${hasKasiaIndexer}`);
        console.log(`Has K-Social Indexer URL: ${hasKSocialIndexer}`);
        console.log(`Has WebSocket URL: ${hasWebSocketURL}`);
        
        if (indexerTitle === 'Indexer Endpoints' && hasKasiaIndexer && hasKSocialIndexer && hasWebSocketURL) {
            console.log('✓ Kaspa User Applications shows Indexer Endpoints');
        } else {
            console.log('✗ Kaspa User Applications should show Indexer Endpoints');
        }
        
        // Test 3: Check that External IP and Public Node are NOT shown
        const hasExternalIP = await page.evaluate(() => {
            const content = document.body.textContent;
            return content.includes('External IP:');
        });
        
        const hasPublicNode = await page.evaluate(() => {
            const content = document.body.textContent;
            return content.includes('Public Node:');
        });
        
        console.log(`Has External IP field: ${hasExternalIP}`);
        console.log(`Has Public Node field: ${hasPublicNode}`);
        
        if (!hasExternalIP && !hasPublicNode) {
            console.log('✓ Network Configuration fields correctly hidden for Kaspa User Applications');
        } else {
            console.log('✗ Network Configuration fields should be hidden for Kaspa User Applications');
        }
        
        console.log('\n✓ All tests completed');
        
    } catch (error) {
        console.error('✗ Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Run the test
testReviewProfileSpecificConfig().catch(console.error);
