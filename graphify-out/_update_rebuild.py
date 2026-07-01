import json
from pathlib import Path
import networkx as nx
from networkx.readwrite import json_graph
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json
from graphify.detect import save_manifest

# 기존 그래프 로드
existing_data = json.loads(Path('graphify-out/graph.json').read_text(encoding="utf-8"))
G = json_graph.node_link_graph(existing_data, edges='links')
n0, e0 = G.number_of_nodes(), G.number_of_edges()

# 신규(변경 파일) 추출 → 병합
extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding="utf-8"))
G_new = build_from_json(extraction)

# 삭제 파일 prune
incremental = json.loads(Path('graphify-out/.graphify_incremental.json').read_text(encoding="utf-8"))
deleted = set(incremental.get('deleted_files', []))
if deleted:
    to_remove = [n for n, d in G.nodes(data=True) if d.get('source_file') in deleted]
    G.remove_nodes_from(to_remove)
    print("Pruned", len(to_remove), "ghost nodes from", len(deleted), "deleted files")

G.update(G_new)
print("Merged: existing", n0, "nodes /", e0, "edges ->", G.number_of_nodes(), "nodes /", G.number_of_edges(), "edges")

# 재클러스터링 + 분석
communities = cluster(G)
cohesion = score_all(G, communities)
gods = god_nodes(G)
surprises = surprising_connections(G, communities)

# detection (전체 코퍼스 메타)
inc_files = incremental.get('files', {})
detection = {
    'total_files': sum(len(v) for v in inc_files.values()),
    'total_words': incremental.get('total_words', 0),
    'needs_graph': True, 'warning': None,
    'files': inc_files,
}
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}
labels = {cid: 'Community ' + str(cid) for cid in communities}
questions = suggest_questions(G, communities, labels)

report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding="utf-8")
to_json(G, communities, 'graphify-out/graph.json')

analysis = {
    'communities': {str(k): v for k, v in communities.items()},
    'cohesion': {str(k): v for k, v in cohesion.items()},
    'gods': gods, 'surprises': surprises, 'questions': questions,
}
Path('graphify-out/.graphify_analysis.json').write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")

# 매니페스트 저장(다음 --update 기준)
save_manifest(incremental['files'])
print("Graph:", G.number_of_nodes(), "nodes,", G.number_of_edges(), "edges,", len(communities), "communities")
