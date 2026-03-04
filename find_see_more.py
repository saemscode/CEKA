from playwright.sync_api import sync_playwright

def find_see_more():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://www.parliament.go.ke/the-national-assembly/house-business/bills", wait_until="networkidle")
        
        # Search for elements containing "See More" or "Read More" (case insensitive)
        results = page.evaluate("""() => {
            const elements = Array.from(document.querySelectorAll('a, button, span, div'));
            return elements
                .filter(el => /see more|read more|view more|details/i.test(el.textContent))
                .map(el => ({
                    tagName: el.tagName,
                    text: el.textContent.trim(),
                    className: el.className,
                    href: el.href || null,
                    html: el.outerHTML
                }));
        }""")
        
        print(f"Found {len(results)} potential 'See More' elements.")
        for r in results[:10]:
            print(f"- {r['text']} ({r['tagName']}) -> {r['href']}")
            
        browser.close()

if __name__ == "__main__":
    find_see_more()
