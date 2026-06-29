from pathlib import Path
import re, json

sql = Path('backend/hexomel_mysql.sql').read_text(encoding='utf-8', errors='ignore')
server = Path('backend/server.js').read_text(encoding='utf-8', errors='ignore')
combined = sql + '\n' + server

def parse_create_tables(text):
    tables = {}
    # Permissive create parser; enough for report analysis
    for match in re.finditer(r'CREATE TABLE IF NOT EXISTS\s+`?([A-Za-z0-9_]+)`?\s*\((.*?)\)\s*ENGINE=', text, re.S | re.I):
        name, body = match.group(1), match.group(2)
        if name not in tables:
            tables[name] = {'name': name, 'columns': [], 'fks': []}
        table = tables[name]
        existing_cols = {c['name'] for c in table['columns']}
        for raw_line in body.splitlines():
            line = raw_line.strip().rstrip(',')
            col = re.match(r'`?([A-Za-z0-9_]+)`?\s+([A-Za-z]+(?:\([^)]*\))?)', line)
            if col and col.group(1).upper() not in {'PRIMARY','UNIQUE','KEY','CONSTRAINT','FOREIGN'}:
                if col.group(1) not in existing_cols:
                    table['columns'].append({'name': col.group(1), 'type': col.group(2)})
                    existing_cols.add(col.group(1))
            fk = re.search(r'FOREIGN KEY \(`?([A-Za-z0-9_]+)`?\) REFERENCES `?([A-Za-z0-9_]+)`? \(`?([A-Za-z0-9_]+)`?\)(.*)', line, re.I)
            if fk:
                item = {'column': fk.group(1), 'ref_table': fk.group(2), 'ref_col': fk.group(3), 'rule': fk.group(4).strip()}
                if item not in table['fks']:
                    table['fks'].append(item)
    return tables

tables = parse_create_tables(combined)
# Add ALTER TABLE columns found in server migrations
for m in re.finditer(r'ALTER TABLE\s+`?([A-Za-z0-9_]+)`?\s+ADD COLUMN\s+`?([A-Za-z0-9_]+)`?\s+([A-Za-z]+(?:\([^)]*\))?)', combined, re.I):
    t, col, typ = m.group(1), m.group(2), m.group(3)
    tables.setdefault(t, {'name': t, 'columns': [], 'fks': []})
    if col not in {c['name'] for c in tables[t]['columns']}:
        tables[t]['columns'].append({'name': col, 'type': typ})

route_count = len(re.findall(r'app\.(?:get|post|put|delete|patch)\(', server))
areas = {
    'Comércio': ['produto','categoria','origem','carrinho','item_carrinho','encomenda','item_encomenda','favoritos','avaliacao'],
    'Utilizadores e segurança': ['cliente','password_recovery','upgrade_requests'],
    'Apicultores e workshops': ['workshop','reserva_workshop'],
    'Comunidade social': ['pergunta_comunidade','resposta_comunidade','mensagem_privada','bloqueio','denuncia'],
    'Aprendizagem': ['quiz_pergunta','quiz_score','aprender_facto','aprender_glossario'],
    'Gestão e SEO': ['interacao','site_slugs','site_settings','menu_nav','cms_content'],
}
summary = {
    'table_count': len(tables),
    'fk_count': sum(len(t['fks']) for t in tables.values()),
    'route_count': route_count,
    'tables': sorted(tables.values(), key=lambda x: x['name']),
    'areas': {area: [name for name in names if name in tables] for area, names in areas.items()},
}
Path('.codex_tmp').mkdir(exist_ok=True)
Path('.codex_tmp/db_full_analysis.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print('tables', summary['table_count'], 'fks', summary['fk_count'], 'routes', summary['route_count'])
for area, names in summary['areas'].items():
    print(area + ':', ', '.join(names))
