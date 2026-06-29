import json, pathlib
base=pathlib.Path('.codex_tmp/report_analysis')
my=json.loads((base/'my_docx_text.json').read_text(encoding='utf-8'))
ref=json.loads((base/'reference_pdf_text.json').read_text(encoding='utf-8'))
print('--- MY FIRST 120 PARAS ---')
for i,p in enumerate(my['paragraphs'][:120], start=1):
    print(f'{i:03d} [{p["style"]}] {p["text"][:180]}')
print('--- MY LAST 90 PARAS ---')
start=max(0,len(my['paragraphs'])-90)
for i,p in enumerate(my['paragraphs'][start:], start=start+1):
    print(f'{i:03d} [{p["style"]}] {p["text"][:220]}')
print('--- REF PAGES 35-63 SNIP ---')
for pg in ref['pages'][34:63]:
    text=pg['text'].replace('\n',' | ')
    print('PAGE', pg['page'], text[:1200])
