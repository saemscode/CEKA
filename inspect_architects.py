from playwright.sync_api import sync_playwright
import json

def inspect_architects_bill():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://www.parliament.go.ke/the-national-assembly/house-business/bills", wait_until="networkidle")
        
        # Find the row containing "Architects"
        row_details = page.evaluate("""() => {
            const results = [];
            // Many ways to find the row
            const rows = document.querySelectorAll('.views-row, tr, .views-field');
            rows.forEach(row => {
                if (row.textContent.includes('Architects')) {
                    const links = Array.from(row.querySelectorAll('a')).map(a => ({
                        text: a.textContent.trim(),
                        href: a.href,
                        html: a.outerHTML
                    }));
                    results.push({
                        tagName: row.tagName,
                        className: row.className,
                        text: row.textContent.trim().substring(0, 200),
                        links: links,
                        outerHTML: row.outerHTML
                    });
                }
            });
            return results;
        }""")
        
        print(json.dumps(row_details, indent=2))
        browser.close()

if __name__ == "__main__":
    inspect_architects_bill()
