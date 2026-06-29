from pathlib import Path
import re, json
server_path=Path('backend/server.js')
server=server_path.read_text(encoding='utf-8', errors='ignore')
pkg=json.loads(Path('backend/package.json').read_text(encoding='utf-8'))
routes=[]
for m in re.finditer(r'app\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)', server):
    routes.append({'method':m.group(1).upper(),'path':m.group(2)})
methods={}
for r in routes: methods[r['method']]=methods.get(r['method'],0)+1
areas={
 'Autenticação e conta': lambda p:'/auth' in p or '/user/profile' in p or '/users/' in p or '/members' in p,
 'Catálogo e produtos': lambda p:'/products' in p or '/categories' in p or '/origins' in p,
 'Carrinho, checkout e encomendas': lambda p:'/cart' in p or '/checkout' in p or '/orders' in p,
 'Apicultor e workshops': lambda p:'/apicultor' in p or '/workshops' in p,
 'Administração e CMS': lambda p:'/admin' in p or '/cms' in p or '/menu' in p or '/site-settings' in p or '/site-slugs' in p,
 'Comunidade e chat': lambda p:'/comunidade' in p or '/messages' in p or '/reports' in p or '/blocks' in p,
 'Aprender e quiz': lambda p:'/quiz' in p or '/aprender' in p,
 'Sistema e analytics': lambda p:'/health' in p or '/logs' in p or '/config' in p or '/upload' in p,
}
area_counts={k:sum(1 for r in routes if fn(r['path'])) for k,fn in areas.items()}
imports=re.findall(r'^import\s+.*?from\s+["\']([^"\']+)["\'];?', server, re.M)
functions=['slugify','generateUniqueSlug','initMailTransporter','generateReceiptHTML','runDatabaseMigrations','authenticateToken','isAdmin']
found_functions=[f for f in functions if f in server]
# Count SQL operation strings crud-ish
sql_ops={op:len(re.findall(r'\b'+op+r'\b', server, re.I)) for op in ['SELECT','INSERT','UPDATE','DELETE','CREATE TABLE','ALTER TABLE']}
out={'server_lines':len(server.splitlines()),'routes_total':len(routes),'methods':methods,'areas':area_counts,'dependencies':pkg.get('dependencies',{}),'imports':imports,'found_functions':found_functions,'sql_ops':sql_ops,'routes_sample':routes[:20]}
Path('.codex_tmp').mkdir(exist_ok=True)
Path('.codex_tmp/backend_45_analysis.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(out, ensure_ascii=False, indent=2))
