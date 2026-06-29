from docx import Document
import re
p = r'C:\escola\pap\code\hexomel_vite\estudo\relatorio\analisei e acreentar\relatorio_v1.docx'
d = Document(p)
for i, par in enumerate(d.paragraphs, 1):
    text = ' '.join(par.text.split())
    style = par.style.name if par.style else ''
    if text and ('Heading' in style or 'Titulo' in style or re.match(r'^\d+(?:\.\d+)*\.?\s+', text) or text in ['Conclusão','Referências bibliográficas','Glossário','Apêndices/Anexos']):
        print(f'{i:03d} [{style}] {text}')
