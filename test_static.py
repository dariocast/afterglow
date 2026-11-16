from pathlib import Path

ROOT = Path(__file__).parent
html = (ROOT / 'index.html').read_text()
css = (ROOT / 'styles.css').read_text()
js = (ROOT / 'app.js').read_text()

assert 'Good things<br /><em>can end.</em>' in html
assert 'post-form' in html and 'feed' in html
assert 'localStorage' in js and 'expiresAt' in js
assert '--accent' in css
print('static contract: PASS')
