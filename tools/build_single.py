"""모든 CSS/JS를 한 파일로 묶은 HTML을 만든다 (오프라인 공유·미리보기용).
사용법: python3 tools/build_single.py dist/cube-coach.html [--fragment]
--fragment: <!doctype>/<head> 없이 본문만 출력 (호스팅 환경이 문서 뼈대를 씌우는 경우)"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'dist/cube-coach.html')
fragment = '--fragment' in sys.argv
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'css/app.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="css/app.css">', '<style>\n' + css + '\n</style>')
def inline_js(m):
    return '<script>\n' + (root / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, html)
html = re.sub(r'<script>\s*if \(\'serviceWorker\'.*?</script>\n', '', html, flags=re.S)
html = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n', '', html)
if fragment:
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
    style = re.search(r'<style>.*?</style>', head, re.S).group(0)
    links = '\n'.join(l for l in head.splitlines() if '<title>' in l or 'fonts.googleapis.com/css2' in l)
    html = '<title>큐브 코치</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + links.replace('<title>큐브 코치</title>', '') + '\n' + style + '\n' + body
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding='utf-8')
print(f'wrote {out} ({len(html)//1024} KB)')
