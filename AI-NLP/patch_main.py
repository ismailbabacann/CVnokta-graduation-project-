import os, sys
sys.stdout.reconfigure(encoding='utf-8')
os.chdir(os.path.join(os.path.dirname(__file__), 'app'))

with open('main.py', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines 1-132 (index 0..131) and 228+ (index 227+)
before = lines[:132]
after  = lines[227:]

new_block = (
    '@app.get("/realtime-interview", include_in_schema=False)\n'
    '@app.get("/demo", include_in_schema=False)\n'
    'async def realtime_interview_room():\n'
    '    """Fully standalone AI interview page - reads ?token= from URL."""\n'
    '    from fastapi.responses import HTMLResponse\n'
    '    from app.static_interview_page import get_interview_html\n'
    '    return HTMLResponse(content=get_interview_html())\n'
    '\n'
)

with open('main.py', 'w', encoding='utf-8') as f:
    f.writelines(before)
    f.write(new_block)
    f.writelines(after)

total = len(open('main.py', encoding='utf-8').readlines())
print(f'Done. Total lines: {total}')
