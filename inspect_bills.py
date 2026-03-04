from playwright.sync_api import sync_playwright
import json

def inspect_bills_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        url = "http://www.parliament.go.ke/the-national-assembly/house-business/bills"
        print(f"Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_timeout(5000)
        
        # Look for the container of bills
        # Usually it's in .view-content or similar
        rows = page.evaluate("""() => {
            const rows = document.querySelectorAll('.view-content .views-row');
            return Array.from(rows).map(row => {
                const links = Array.from(row.querySelectorAll('a')).map(a => ({
                    text: a.textContent.trim(),
                    href: a.href,
                    html: a.outerHTML
                }));
                return {
                    rowText: row.textContent.trim(),
                    links: links
                };
            });
        }""")
        
        if not rows:
             # Try broader search
             rows = page.evaluate("""() => {
                const articles = document.querySelectorAll('article, .field-items, .field-item');
                return Array.from(articles).slice(0, 10).map(row => ({
                    rowText: row.textContent.trim().substring(0, 100),
                    links: Array.from(row.querySelectorAll('a')).map(a => ({
                        text: a.textContent.trim(),
                        href: a.href
                    }))
                }));
             }""")

        print(json.dumps(rows[:5], indent=2))
        browser.close()

if __name__ == "__main__":
    inspect_bills_page()
