from playwright.sync_api import sync_playwright
import json

def find_details_link():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        url = "http://www.parliament.go.ke/the-national-assembly/house-business/bills"
        page.goto(url, wait_until="networkidle")
        
        # Search for "Architects Bill"
        # Find the row or element containing this text
        bill_info = page.evaluate("""() => {
            const results = [];
            document.querySelectorAll('.views-row').forEach(row => {
                const text = row.textContent.trim();
                if (text.includes('Architects')) {
                    const links = Array.from(row.querySelectorAll('a')).map(a => ({
                        text: a.textContent.trim(),
                        href: a.href,
                        target: a.target
                    }));
                    results.push({ rowText: text, links: links });
                }
            });
            return results;
        }""")
        
        print(json.dumps(bill_info, indent=2))
        
        if bill_info and bill_info[0]['links']:
            # Try to find a link that doesn't end in .pdf
            detail_links = [l for l in bill_info[0]['links'] if not l['href'].lower().endswith('.pdf')]
            if detail_links:
                detail_url = detail_links[0]['href']
                print(f"Following detail link: {detail_url}")
                page.goto(detail_url, wait_until="networkidle")
                content = page.evaluate("""() => {
                    return {
                        title: document.title,
                        body: document.querySelector('.field-items, .field-item, .content')?.innerText.trim() || document.body.innerText.substring(0, 1000)
                    };
                }""")
                print("Detail page content:")
                print(json.dumps(content, indent=2))
            else:
                print("No non-PDF links found in the bill row.")
                
        browser.close()

if __name__ == "__main__":
    find_details_link()
