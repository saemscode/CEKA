from playwright.sync_api import sync_playwright
import json

def find_see_more_everywhere():
    urls = [
        "http://www.parliament.go.ke/the-national-assembly",
        "http://www.parliament.go.ke/the-national-assembly/house-business/bills",
        "http://www.parliament.go.ke/the-national-assembly/house-business/bill-tracker"
    ]
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        for url in urls:
            print(f"--- Checking {url} ---")
            page.goto(url, wait_until="networkidle")
            results = page.evaluate("""() => {
                const elements = Array.from(document.querySelectorAll('a, button, span, div'));
                return elements
                    .filter(el => /see more|read more|view more|details/i.test(el.textContent))
                    .map(el => ({
                        tagName: el.tagName,
                        text: el.textContent.trim(),
                        href: el.href || null,
                        html: el.outerHTML
                    }));
            }""")
            for r in results[:5]:
                print(f"Found: {r['text']} -> {r['href']}")
                
        browser.close()

if __name__ == "__main__":
    find_see_more_everywhere()
