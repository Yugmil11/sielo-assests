"""Build terms-body.html / privacy-body.html (Wix fragments) and terms.html / privacy.html (standalone)
from the verbatim legal text in legal/terms.txt and legal/privacy.txt.
Structure rules: numbered 'N.Heading' lines become section headings, lines starting with a lowercase 'o'
bullet (Wix's bullet glyph) become list items, '(a)/(i)' lines become indented sub-paragraphs."""
import html, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
EMAIL = re.compile(r'([\w.+-]+@[\w-]+(?:\.[\w-]+)+)')
URL = re.compile(r'(https?://[^\s"\']+?)(?=[\s"\')]|$)')

def inline(text):
    t = html.escape(text, quote=False)
    t = URL.sub(lambda m: f'<a href="{m.group(1)}">{m.group(1)}</a>', t)
    t = EMAIL.sub(lambda m: f'<a href="mailto:{m.group(1)}">{m.group(1)}</a>', t)
    return t

def build_terms(lines):
    out, ul = [], []
    def flush():
        nonlocal ul
        if ul: out.append('<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in ul) + '</ul>'); ul = []
    for l in lines:
        if l == 'WEBSITE TERMS OF USE':
            flush(); out.append(f'<p class="eyebrow">{inline(l)}</p>'); continue
        m = re.match(r'^(\d+)\.(\S.*)$', l)
        if m and not l.startswith(('(',)):
            flush(); out.append(f'<h2><span class="num">{m.group(1)}.</span> {inline(m.group(2))}</h2>'); continue
        if len(l) > 1 and l[0] == 'o' and l[1].isalpha() and not l.startswith(('of ', 'on ', 'or ', 'our ')):
            ul.append(l[1:]); continue
        flush()
        if re.match(r'^\([a-z]+\)', l):
            out.append(f'<p class="sub">{inline(l)}</p>'); continue
        out.append(f'<p>{inline(l)}</p>')
    flush()
    return '\n'.join(out)

def build_privacy(lines):
    out, ol = [], []
    def flush():
        nonlocal ol
        if ol: out.append('<ol>' + ''.join(f'<li>{inline(x)}</li>' for x in ol) + '</ol>'); ol = []
    for i, l in enumerate(lines):
        if i == 0: out.append(f'<p class="eyebrow">{inline(l)}</p>'); continue
        if i == 1: continue   # 'PRIVACY POLICY' — the page title already says it
        if i == 2: out.append(f'<p class="meta">{inline(l)}</p>'); continue
        m = re.match(r'^(\d+)\.(\S.*)$', l)
        if m: ol.append(m.group(2)); continue
        flush()
        if len(l) < 80 and not l.endswith(('.', ':', ';')):
            out.append(f'<h2>{inline(l)}</h2>'); continue
        out.append(f'<p>{inline(l)}</p>')
    flush()
    return '\n'.join(out)

NAV = '''<nav class="sielo-subnav">
  <a href="index.html" class="logo" aria-label="Sielo Robotics home"><img src="media/logo.png" alt="Sielo Robotics"></a>
  <div class="right">
    <div class="links">
      <a href="index.html" class="pill">Home</a>
      <a href="index.html#people" class="pill">People</a>
      <a href="index.html#faq" class="pill">FAQ</a>
      <a href="contact.html" class="pill">Contact</a>
    </div>
    <a href="https://calendly.com/evanzeglinskispinney/product-demo" target="_blank" rel="noopener" class="btn-nav">Book a Demo</a>
  </div>
</nav>'''
FOOTER = '''<footer class="sielo-footer">
  <div class="inner">
    <img src="media/logo.png" alt="Sielo Robotics">
    <div class="links">
      <a href="contact.html">Contact Us</a>
      <a href="terms.html">Terms of Use</a>
      <a href="privacy.html">Privacy Policy</a>
    </div>
    <p class="copy">Sielo Robotics © 2026</p>
  </div>
</footer>'''

def fragment(key, title, body):
    return f'''<div class="sielo sielo-page" id="sielo-root" data-legal-page="{key}">
{NAV}
<main class="sielo-legal">
  <article class="inner">
    <h1>{title}</h1>
{body}
  </article>
</main>
{FOOTER}
</div>
'''

def standalone(title, frag, version):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — Sielo Robotics</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="styles.css?v={version}">
</head>
<body class="sielo-body">
{frag}<script src="app.js?v={version}"></script>
<script>SieloSite.mountPage(document.getElementById('sielo-root'), {{}});</script>
</body>
</html>
'''

if __name__ == '__main__':
    version = re.search(r"VERSION = '([^']+)'", (ROOT / 'wix-element.js').read_text()).group(1)
    for key, title, builder in [('terms', 'Terms of Use', build_terms), ('privacy', 'Privacy Policy', build_privacy)]:
        lines = [l.strip() for l in (ROOT / 'legal' / f'{key}.txt').read_text(encoding='utf-8').split('\n') if l.strip()]
        frag = fragment(key, title, builder(lines))
        (ROOT / f'{key}-body.html').write_text(frag, encoding='utf-8')
        (ROOT / f'{key}.html').write_text(standalone(title, frag, version), encoding='utf-8')
        print(key, 'ok', len(frag), 'bytes')
