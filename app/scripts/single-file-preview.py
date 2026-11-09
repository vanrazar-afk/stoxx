"""Turn `expo export --platform web` output (dist/) into ONE self-contained index.html
(JS + fonts + icons inlined) — handy for sharing a quick preview anywhere.
Usage: python3 scripts/single-file-preview.py dist out/index.html"""
import base64, glob, os, re, sys
src, out = sys.argv[1], sys.argv[2]
os.chdir(src)
html = open('index.html').read().replace('__BASE__', '')
scripts = re.findall(r'<script src="([^"]+)"[^>]*></script>', html)
used = lambda p: (p.endswith('.png') and 'react-navigation' in p) or 'Feather' in p or any(w in p for w in ['400Regular', '500Medium', '700Bold', '800ExtraBold'])
assets = {}
for f in glob.glob('assets/**/*', recursive=True):
    if os.path.isfile(f) and used(f):
        mime = 'font/ttf' if f.endswith('.ttf') else 'image/png'
        assets['/' + f] = 'data:%s;base64,%s' % (mime, base64.b64encode(open(f, 'rb').read()).decode())
inl = ''
for s in scripts:
    js = open('.' + s).read()
    for k, v in assets.items():
        js = js.replace(k, v)
    inl += '<script>' + js.replace('</script', '<\\/script') + '</script>'
html = re.sub(r'<script src="[^"]+"[^>]*></script>', '', html)
pre = '<script>try{if(location.pathname!=="/")history.replaceState(null,"","/")}catch(e){}</script>'
html = html.replace('</body>', pre + inl + '</body>')
html = re.sub(r'<title>.*?</title>', '<title>StoXX</title>', html)
os.chdir('..') if False else None
open(out if os.path.isabs(out) else os.path.join(os.getcwd(), '..', out), 'w').write(html)
print('written', out)
