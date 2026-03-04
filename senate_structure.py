from playwright.sync_api import sync_playwright
import json

def get_senate_structure():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        url = "http://www.parliament.go.ke/the-senate/house-business/bills"
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_timeout(5000)
        
        rows = page.evaluate("""() => {
            const results = [];
            document.querySelectorAll('.view-content .views-row').forEach((row, i) => {
                if (i > 10) return;
                results.push({
                    text: row.textContent.trim().substring(0, 300),
                    links: Array.from(row.querySelectorAll('a')).map(a => ({
                        text: a.textContent.trim(),
                        href: a.href,
                        html: a.outerHTML
                    }))
                });
            });
            return results;
        }""")
        
        print(json.dumps(rows, indent=2))
        browser.close()

if __name__ == "__main__":
    get_senate_structure()
