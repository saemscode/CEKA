from playwright.sync_api import sync_playwright
import json

def get_listing_structure():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        url = "http://www.parliament.go.ke/the-national-assembly/house-business/bills"
        page.goto(url, wait_until="networkidle")
        
        # Get all rows in the view-content
        rows = page.evaluate("""() => {
            const results = [];
            // Try different containers
            const containers = document.querySelectorAll('.view-content, .field-items, tbody, .item-list');
            containers.forEach(container => {
                const items = container.querySelectorAll('.views-row, tr, li');
                items.forEach((item, i) => {
                    if (i > 15) return; // Limit to first 15
                    const links = Array.from(item.querySelectorAll('a')).map(a => ({
                        text: a.textContent.trim(),
                        href: a.href,
                        html: a.outerHTML
                    }));
                    if (links.length > 0) {
                        results.push({
                            index: i,
                            text: item.textContent.trim().substring(0, 100),
                            links: links
                        });
                    }
                });
            });
            return results;
        }""")
        
        print(json.dumps(rows, indent=2))
        browser.close()

if __name__ == "__main__":
    get_listing_structure()
