import sys
from playwright.sync_api import sync_playwright

CHROME = "C:/Users/wskyl/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe"
SHOT = "C:/Users/Public"

QUESTIONS = [
    ("01_report_bar",            "월별 사용 내역 알려줘"),
    ("02_catSpend_donut",        "편의점에서 쓴 내역 알려줘"),
    ("03_friendCompare_compare", "친구랑 비교해줘"),
    ("04_nudgeCompare_compare",  "조르기 비교해줘"),
    ("05_merchantMap_map",       "근처 사용 가능 가맹점 알려줘"),
    ("06_balance_gauge",         "남은 금액 알려줘"),
    ("07_channel_donut",         "온라인 오프라인 결제 내역 알려줘"),
    ("08_merchantBreak_barlist", "어디에 주로 썼어"),
    ("09_parentCard_list",       "부모 카드 내역 알려줘"),
    ("10_schoolCompare_compare", "학교별 비교해줘"),
    ("11_unknown_table",         "이번 주 무슨 요일에 많이 썼어"),
]
errors = []

def wait_done(page, timeout=35000):
    # 타이핑 인디케이터(.edupay-dot)가 사라질 때까지 대기 = 응답 완료
    page.wait_for_timeout(700)
    try:
        page.wait_for_function("document.querySelectorAll('.edupay-dot').length===0", timeout=timeout)
    except Exception:
        errors.append("timeout waiting for response")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=CHROME)
    page = browser.new_page(viewport={"width": 412, "height": 900})
    logs = []
    page.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    page.on("pageerror", lambda e: errors.append(f"PAGEERROR: {e}"))

    # 자유대화는 로컬로(operia AI 경로만 검증). operia AI 모드는 .env VITE_OPERIA_AI=true.
    page.add_init_script("try { localStorage.setItem('edupay_ai_enabled','false'); } catch(e){}")
    page.goto("http://localhost:5173/?view=webview")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)

    # 채팅 진입(ledger=로컬, AI콜 없음)
    page.get_by_text("용돈기입장").first.click()
    wait_done(page, 8000)
    inp = page.get_by_placeholder("메시지를 입력하세요")

    for slug, q in QUESTIONS:
        inp.fill(q)
        inp.press("Enter")
        wait_done(page, 40000)
        page.wait_for_timeout(400)
        page.screenshot(path=f"{SHOT}/edupay_ai_{slug}.png", full_page=True)
        err = page.get_by_text("데이터를 불러오지 못했어").count()
        print(f"[{'ERR' if err else 'ok'}] {slug}: {q}")
        if err:
            errors.append(f"{slug}: operia 에러 메시지(AI 호출 실패 가능) — {q}")

    browser.close()

print("\n--- console errors (non-HMR) ---")
for l in logs:
    if l.startswith("error") and "localhost:443" not in l and "ERR_CONNECTION_REFUSED" not in l:
        print(l)
print("\n--- issues ---")
for e in errors:
    print(e)
print("\nRESULT:", "FAILED" if errors else "PASS")
sys.exit(1 if errors else 0)
