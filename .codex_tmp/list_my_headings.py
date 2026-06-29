import json, pathlib, re
my=json.loads(pathlib.Path('.codex_tmp/report_analysis/my_docx_text.json').read_text(encoding='utf-8'))
print('--- MY HEADING-LIKE PARAS ALL ---')
for i,p in enumerate(my['paragraphs'], start=1):
    text=p['text']
    style=p['style']
    if 'Heading' in style or re.match(r'^\d+(?:\.\d+)*\.?\s+', text) or text in ['Conclusão','Referências bibliográficas','Glossário','Apêndices/Anexos','Bibliografia']:
        print(f'{i:03d} [{style}] {text}')
