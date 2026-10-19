import json
import re
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / "chapter6-batch03"
TARGET_CODE = "PHY7-U06-S13-I05"
NEW_PROMPT = (
    "Պատկերում կշեռքի երկու կողմերում կախված են հավասար բեռներ, որոնց տակ դրված են ջրով և "
    "կերոսինով անոթներ։ Բեռները հեղուկների մեջ լրիվ ընկղմելիս ո՞ր լրացուցիչ պայմանն է կարևոր "
    "հեղուկների ազդեցությունը ճիշտ համեմատելու համար։"
)
NEW_STIMULUS = {
    "kind": "image",
    "url": "https://www.haiedu.am/assets/textbook/physics7-2023/p152-liquid-density-comparison-v2.png",
    "altHy": (
        "Կշեռքի երկու կողմերում կախված են հավասար բեռներ, որոնց տակ դրված են ջրով և կերոսինով "
        "անոթներ՝ բեռները հեղուկների մեջ ընկղմելով համեմատություն կատարելու համար։"
    ),
    "source": {
        "edition": "Physics 7 (2023)",
        "printedPage": 152,
        "sha256": "8e3d02ffa9b5e836881ea887b6b45dd3fd0610bec3f08d29e8ad3b547c08d8d6",
        "textbookSha256": "d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904",
        "transformation": "Exact source crop, no redrawing.",
    },
}


def compact(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return " ".join(compact(v) for v in value)
    if isinstance(value, dict):
        return " ".join(compact(v) for _, v in sorted(value.items()))
    return str(value)


def norm(value):
    return re.sub(r"\s+", " ", compact(value)).strip()


profiles = json.loads((SOURCE / "corpus-profiles.json").read_text())
specs = json.loads((SOURCE / "specs-all.json").read_text())
target = next(spec for spec in specs if spec["code"] == TARGET_CODE)

# The Batch 3 comparison corpus was frozen before Batch 3 staging. Add the
# complete staged Batch 3 set so the correction is compared with the current
# chapter bank as well as the original whole-bank corpus.
for spec in specs:
    profiles.append(
        {
            "ref": f"{spec['code']}@batch3-v1",
            "kind": "batch3_item",
            "code": spec["code"],
            "skillCode": f"PHY7-U06-{spec['skill']}",
            "text": norm(spec["promptHy"]),
            "options": [norm(option) for _, option in sorted(spec["optionsHy"].items())],
            "answer": spec["answer"],
            "explanation": norm(spec["explanationHy"]),
            "stimulus": spec.get("stimulus") or {},
            "comparisonText": norm(
                [
                    spec["promptHy"],
                    spec["optionsHy"],
                    spec["explanationHy"],
                    spec.get("guide", {}),
                    spec.get("stimulus", {}),
                ]
            ),
        }
    )

candidate_text = norm(
    [
        NEW_PROMPT,
        target["optionsHy"],
        target["explanationHy"],
        target.get("guide", {}),
        NEW_STIMULUS,
    ]
)
texts = [profile["comparisonText"] for profile in profiles]
vectorizer = TfidfVectorizer(
    analyzer="char",
    ngram_range=(3, 5),
    min_df=2,
    max_features=150000,
    sublinear_tf=True,
)
matrix = vectorizer.fit_transform(texts + [candidate_text])
scores = cosine_similarity(matrix[-1], matrix[:-1]).ravel()
ranked = scores.argsort()[::-1]

nearest = []
seen = set()
for index in ranked:
    profile = profiles[index]
    signature = (profile.get("code"), profile.get("text"), profile.get("kind") == "guide")
    if signature in seen:
        continue
    seen.add(signature)
    nearest.append(
        {
            "score": round(float(scores[index]), 6),
            **{key: value for key, value in profile.items() if key != "comparisonText"},
        }
    )
    if len(nearest) == 20:
        break

result = {
    "targetCode": TARGET_CODE,
    "comparisonProfileCount": len(profiles),
    "baseProfileCount": len(profiles) - len(specs),
    "addedBatch3ProfileCount": len(specs),
    "selfHistoryRef": f"{TARGET_CODE}@batch3-v1",
    "nearest": nearest,
}
(ROOT / "s13-revision-retrieval.json").write_text(
    json.dumps(result, ensure_ascii=False, indent=2) + "\n"
)
print(json.dumps(result, ensure_ascii=False, indent=2))
