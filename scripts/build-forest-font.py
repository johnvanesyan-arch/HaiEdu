"""Generate the normal-width Forest UI delivery font; retain the upstream TTF."""
from pathlib import Path
from hashlib import sha256
from importlib.metadata import version
import json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

root = Path(__file__).resolve().parents[1]
directory = root / 'web/assets/fonts'
source = directory / 'noto-sans-armenian-variable.ttf'
assert version('fonttools') == '4.61.1' and version('Brotli') == '1.2.1', 'Install scripts/requirements-ui-font.txt'
original = TTFont(source, recalcTimestamp=False)
delivery = TTFont(source, recalcTimestamp=False)
# The existing CSS face uses normal width (100). All glyphs and the complete
# weight axis remain. Do not optimize IUP: retain exact outline interpolation.
instantiateVariableFont(delivery, {'wdth': 100}, inplace=True, optimize=False)
delivery.flavor = 'woff2'
from io import BytesIO
buffer = BytesIO(); delivery.save(buffer); data = buffer.getvalue()
digest = sha256(data).hexdigest()
name = 'noto-sans-armenian-ui-' + digest[:12] + '.woff2'
(directory / name).write_bytes(data)
decoded = TTFont(BytesIO(data), recalcTimestamp=False)
assert original.getBestCmap() == decoded.getBestCmap()
assert original.getGlyphOrder() == decoded.getGlyphOrder()
def normalized(value):
    if isinstance(value, (list, tuple)): return tuple(normalized(x) for x in value)
    return round(value, 6) if isinstance(value, float) else value
weights = [100, 400, 500, 600, 700, 800, 900]
for weight in weights:
    old = original.getGlyphSet(location={'wght': weight, 'wdth': 100})
    new = decoded.getGlyphSet(location={'wght': weight})
    for glyph in original.getGlyphOrder():
        a, b = DecomposingRecordingPen(old), DecomposingRecordingPen(new)
        old[glyph].draw(a); new[glyph].draw(b)
        assert normalized(a.value) == normalized(b.value), (weight, glyph, 'outline')
        assert round(old[glyph].width, 6) == round(new[glyph].width, 6), (weight, glyph, 'advance')
manifest = {
    'version': 1, 'scope': 'Shared Forest UI at its existing normal width; full weight range and glyph coverage',
    'source': {'file': source.name, 'bytes': source.stat().st_size, 'sha256': sha256(source.read_bytes()).hexdigest()},
    'delivery': {'file': name, 'bytes': len(data), 'sha256': digest, 'width': 100, 'weightRange': [100, 900]},
    'toolchain': {'fonttools': version('fonttools'), 'brotli': version('Brotli'), 'optimizeIup': False, 'recalculateTimestamp': False,
                  'recipeSha256': sha256(Path(__file__).read_bytes()).hexdigest()},
    'verification': {'glyphs': len(original.getGlyphOrder()), 'codepoints': len(original.getBestCmap()), 'weights': weights,
                     'outlineAndAdvanceComparisons': len(original.getGlyphOrder()) * len(weights), 'allMatchAtTestedWeights': True},
    'license': 'OFL-NotoSansArmenian.txt', 'licenseSha256': sha256((directory / 'OFL-NotoSansArmenian.txt').read_bytes()).hexdigest(), 'fallback': source.name,
}
(directory / 'forest-font.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
