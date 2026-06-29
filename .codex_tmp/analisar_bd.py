from pathlib import Path
import re, json
sql_path = Path('backend/hexomel_mysql.sql')
server_path = Path('backend/server.js')
sql = sql_path.read_text(encoding='utf-8', errors='ignore')
server = server_path.read_text(encoding='utf-8', errors='ignore')

tables = []
for match in re.finditer(r'CREATE TABLE IF NOT EXISTS `([^`]+)` \((.*?)\) ENGINE=', sql, re.S):
    name, body = match.group(1), match.group(2)
    cols=[]
    fks=[]
    for line in body.splitlines():
        line=line.strip().rstrip(',')
        col=re.match(r'`([^`]+)`\s+([^,]+)', line)
        if col and not line.startswith(('PRIMARY','UNIQUE','KEY','CONSTRAINT')):
            cols.append({'name': col.group(1), 'type': col.group(2).split()[0]})
        fk=re.search(r'FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)` \(`([^`]+)`\)(.*)', line)
        if fk:
            fks.append({'column': fk.group(1), 'ref_table': fk.group(2), 'ref_col': fk.group(3), 'rule': fk.group(4).strip()})
    tables.append({'name':name,'columns':cols,'fks':fks})

routes=[]
for m in re.finditer(r'app\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)', server):
    routes.append({'method':m.group(1).upper(),'path':m.group(2)})

out = {
 'table_count': len(tables),
 'tables': tables,
 'fk_count': sum(len(t['fks']) for t in tables),
 'route_count': len(routes),
 'routes_by_area': {
   'auth': [r for r in routes if '/auth' in r['path']],
   'products': [r for r in routes if '/products' in r['path'] or '/categories' in r['path'] or '/origins' in r['path']],
   'cart_checkout_orders': [r for r in routes if '/cart' in r['path'] or '/checkout' in r['path'] or '/orders' in r['path']],
   'apicultor_workshops': [r for r in routes if '/apicultor' in r['path'] or '/workshops' in r['path']],
   'community_social': [r for r in routes if '/comunidade' in r['path'] or '/messages' in r['path'] or '/reports' in r['path'] or '/users/block' in r['path']],
   'learn': [r for r in routes if '/quiz' in r['path'] or '/aprender' in r['path']],
   'admin': [r for r in routes if '/admin' in r['path']],
 }
}
Path('.codex_tmp').mkdir(exist_ok=True)
Path('.codex_tmp/db_analysis.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
print('tables', out['table_count'], 'fks', out['fk_count'], 'routes', out['route_count'])
print('table names:', ', '.join(t['name'] for t in tables))
for area, rs in out['routes_by_area'].items(): print(area, len(rs))
