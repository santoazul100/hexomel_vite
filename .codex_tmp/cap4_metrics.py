from pathlib import Path
import re, json
server = Path('backend/server.js').read_text(encoding='utf-8', errors='ignore')
sql = Path('backend/hexomel_mysql.sql').read_text(encoding='utf-8', errors='ignore')
frontend_files = list(Path('frontend').glob('*.html'))
js_files = list(Path('frontend/src').glob('*.js'))
css_files = list(Path('frontend/src/styles').glob('*.css'))
routes = re.findall(r'app\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)', server)
tables = set(re.findall(r'CREATE TABLE IF NOT EXISTS\s+`?([A-Za-z0-9_]+)`?', sql + '\n' + server, re.I))
alters = re.findall(r'ALTER TABLE\s+`?([A-Za-z0-9_]+)`?\s+ADD COLUMN\s+`?([A-Za-z0-9_]+)`?', sql + '\n' + server, re.I)
areas = {
 'auth': [p for _,p in routes if '/auth' in p],
 'products': [p for _,p in routes if '/products' in p or '/categories' in p or '/origins' in p],
 'checkout': [p for _,p in routes if '/checkout' in p or '/cart' in p or '/orders' in p],
 'apicultor': [p for _,p in routes if '/apicultor' in p or '/workshops' in p],
 'admin': [p for _,p in routes if '/admin' in p],
 'social': [p for _,p in routes if '/messages' in p or '/reports' in p or '/comunidade' in p or '/members' in p],
 'learn': [p for _,p in routes if '/quiz' in p or '/aprender' in p],
}
out = {'routes_total': len(routes),'tables_total': len(tables),'alter_columns': len(alters),'html_pages': len(frontend_files),'js_modules': len(js_files),'css_files': len(css_files),'areas': {k:len(v) for k,v in areas.items()},'html_names':[p.name for p in frontend_files], 'js_names':[p.name for p in js_files], 'tables': sorted(tables)}
Path('.codex_tmp').mkdir(exist_ok=True)
Path('.codex_tmp/cap4_metrics.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(out, ensure_ascii=False, indent=2))
