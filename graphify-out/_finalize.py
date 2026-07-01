import json
from pathlib import Path
from graphify.cache import save_semantic_cache

# 1) 신규 시맨틱 결과 캐시 저장
new = json.loads(Path('graphify-out/.graphify_semantic_new.json').read_text(encoding="utf-8"))
saved = save_semantic_cache(new.get('nodes', []), new.get('edges', []), new.get('hyperedges', []))
print("Cached", saved, "files")

# 2) 캐시본 + 신규 → .graphify_semantic.json (여기선 캐시본 없음)
cached = json.loads(Path('graphify-out/.graphify_cached.json').read_text(encoding="utf-8")) if Path('graphify-out/.graphify_cached.json').exists() else {'nodes': [], 'edges': [], 'hyperedges': []}
all_nodes = cached['nodes'] + new.get('nodes', [])
all_edges = cached['edges'] + new.get('edges', [])
all_hyper = cached.get('hyperedges', []) + new.get('hyperedges', [])
seen = set(); deduped = []
for n in all_nodes:
    if n['id'] not in seen:
        seen.add(n['id']); deduped.append(n)
sem = {'nodes': deduped, 'edges': all_edges, 'hyperedges': all_hyper, 'input_tokens': new.get('input_tokens', 0), 'output_tokens': new.get('output_tokens', 0)}
Path('graphify-out/.graphify_semantic.json').write_text(json.dumps(sem, indent=2, ensure_ascii=False), encoding="utf-8")
print("Semantic:", len(deduped), "nodes", len(all_edges), "edges")

# 3) AST + 시맨틱 최종 병합 → .graphify_extract.json
ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding="utf-8"))
seen2 = {n['id'] for n in ast['nodes']}
merged_nodes = list(ast['nodes'])
for n in sem['nodes']:
    if n['id'] not in seen2:
        merged_nodes.append(n); seen2.add(n['id'])
merged = {'nodes': merged_nodes, 'edges': ast['edges'] + sem['edges'], 'hyperedges': sem.get('hyperedges', []), 'input_tokens': sem.get('input_tokens', 0), 'output_tokens': sem.get('output_tokens', 0)}
Path('graphify-out/.graphify_extract.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
print("Extract merged:", len(merged_nodes), "nodes", len(merged['edges']), "edges (", len(ast['nodes']), "AST +", len(sem['nodes']), "semantic )")
