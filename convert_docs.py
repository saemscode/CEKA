import os
from docx import Document

docx_files = [
    "outputs/CEKA_Constitution_Master_Identity.docx",
    "outputs/CEKA_Concept_Note.docx",
    "outputs/CEKA_Product_Bible.docx",
    "outputs/CEKA_10Year_Strategic_Blueprint.docx",
    "outputs/CEKA_Brand_Narrative_Guide.docx"
]

for docx_file in docx_files:
    if not os.path.exists(docx_file):
        print(f"⚠️ Missing: {docx_file}")
        continue
    doc = Document(docx_file)
    text = "\n".join([p.text for p in doc.paragraphs])
    txt_file = docx_file.replace(".docx", ".txt")
    with open(txt_file, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"✓ Created {txt_file}")