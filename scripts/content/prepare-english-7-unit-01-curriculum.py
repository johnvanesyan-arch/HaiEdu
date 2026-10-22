#!/usr/bin/env python3
"""Prepare a guarded, data-only English Unit 1 curriculum registration.

Reads captured metadata and source probes. Does not connect to a database,
approve content, adopt assessment criteria, or activate a release.
"""
import argparse
import hashlib
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def identity(key):
    return str(uuid5(NAMESPACE_URL, "https://www.haiedu.am/curriculum/" + key))


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("manifest_output", type=Path)
    args = parser.parse_args()
    w = args.workspace
    captured = json.loads((w / "inventory.json").read_text())
    inv, meta, guard = captured["inventory"], captured["metadata"], captured["guards"]
    baseline = json.loads((w / "baseline.json").read_text())
    probes = json.loads((w / "source-probes.json").read_text())
    release, programme = inv["release"], inv["programme"]
    release_id, programme_id = release["id"], programme["id"]
    unit_id = guard["releaseUnits"][0]["unit_id"]
    assert release["status"] == "draft" and release["reconciliation_id"] is None
    assert inv["topics"] is None and inv["sourceBindings"] is None
    assert guard["releaseFamilySample"] is None
    skills = {s["code"][-3:]: s for s in inv["skills"]}
    families = meta["families"]
    assert set(skills) == {f"S{i:02}" for i in range(1, 15)}
    assert len(families) == len({f["id"] for f in families}) == 200
    assert len({f["code"] for f in families}) == 200
    assert len(guard["releaseSkills"]) == 14
    assert all(s["outcome_mapping_snapshot"] == [] for s in guard["releaseSkills"])
    assert {s["skill_id"] for s in guard["releaseSkills"]} == {s["id"] for s in skills.values()}
    assert all(f["skill_id"] in {s["id"] for k, s in skills.items() if k <= "S12"} for f in families)
    appendix_hash = hashlib.sha256((w / "standard-2026.docx").read_bytes()).hexdigest()
    assert appendix_hash == "44bfb23bfab1ded26c7f75d89c9252885ed58ae37aebfae876b5fb964ed3ad12"
    framework = next(s for s in inv["sources"] if s["document_type"] == "national_framework")
    authority = next(s["authority_id"] for s in inv["sources"] if s["document_type"] == "grade_programme")
    for probe in probes:
        assert hashlib.sha256((w / (probe["name"] + ".html")).read_bytes()).hexdigest() == probe["sha256"]

    standard_id = identity("am_foreign_languages_standard_36n_61n_english")
    programme_doc_id = identity("am_foreign_languages_grade7_programme_116n_english")
    topic_id = identity("english7_u01_topic1")
    run_id = identity("english7_u01_2026_08_14")
    now = max(p["observedAt"] for p in probes)
    owner = {
        "date": "2026-10-22",
        "statement": "Don't worry about the privacy. Continue as before. I will switch back to private as soon as the new hours take effect next month.",
        "disposition": "Continue with the existing accepted Unit 1 bank for the provisional MVP despite its confirmed public-source exposure.",
        "scope": "The existing English Unit 1 bank and five C19 form candidates; no replacement authoring is required for this exposure issue.",
        "limitations": [
            "Does not establish that the questions or source texts/scripts are unseen.",
            "Does not constitute independent SME approval, source/voice licensing, assessment-policy adoption or learner-release activation.",
            "Owner intends to restore private repository visibility next month; no visibility change or scheduled action is performed here.",
            "Database, role, tenant, private audio and learner-data controls remain unchanged."
        ],
    }
    source_snapshot = {
        "schemaVersion": "haiedu-english-unit-curriculum-v1",
        "sourceCommitBeforeRegistration": captured["sourceCommit"],
        "sources": probes,
        "subjectStandardAppendix": {
            "url": "https://www.arlis.am/acts/files/363137/" + appendix_hash,
            "sha256": appendix_hash,
            "bytes": (w / "standard-2026.docx").stat().st_size,
            "grade7CommunicationTable": {"xmlTableZeroBased": 5, "xmlRowZeroBased": 7},
            "matchesAcceptedPreparationHash": True,
        },
        "textbookSha256": "9118c0f8847672eab33e4a2a78087d7097566cb347c83b5912036e091a7b9ab9",
        "textbookUnit": 1, "programmeTopic": 1,
        "textbookSequenceRetained": True,
        "printedProgrammeFrameworkReferences": ["Հ3", "Հ5", "Հ12", "Հ13", "Հ15", "Հ22", "Հ25", "Հ26", "Հ29", "Հ30", "Հ31", "Հ32", "Հ33", "Հ34", "Հ37", "Հ42", "Հ45"],
        "currentFrameworkLanguageReference": "Հ4",
        "frameworkMappingNote": "The 2023 programme's topic-level reference list is preserved as printed. In the current 2026 framework, Annex 2 section 4 paragraph 10(4) is the foreign-language descriptor; 10(3) concerns visual/digital aids. Current semantic mappings use Հ4, not a blind carry-over of the older numbering. One English unit does not satisfy the whole multi-language descriptor.",
        "mappingAuthor": "Codex source-based technical reconciliation; no independent human reviewer claimed",
        "independentSmeApproved": False,
        "classroomOnlyOutcomes": ["T1.L3", "T1.L4", "T1.L5"],
        "qualitativeSupportingOutcome": "T1.L7",
        "writingSampleCount": 1,
        "publicExposureDisposition": owner,
    }
    inserts = {}
    common = {
        "authority_id": authority, "source_class": "normative",
        "subject_id": programme["subject_id"], "revision_status": "current",
        "verification_status": "verified", "verified_at": now, "verified_by": None,
    }
    inserts["curriculum_source_documents"] = [
        dict(common, id=standard_id, source_key="am_foreign_languages_standard_36n_61n_english",
             document_type="subject_standard", grade_id=None,
             title_hy="«Օտար լեզուներ» բնագավառի 2–12-րդ դասարանների առարկայական չափորոշիչ՝ անգլերենի կիրառությամբ",
             title_en="Foreign languages subject standard, Grades 2–12 — English applicability",
             legal_identifier="N 36-Ն", current_amendment_identifier="N 61-Ն",
             version_label="N 36-Ն with appendix replaced by N 61-Ն; effective 14 August 2026",
             official_url="https://www.arlis.am/hy/acts/229389", adopted_on="2023-03-30",
             effective_from="2026-08-14",
             notes="Official source identity/current incorporation verified technically. Appendix SHA256 " + appendix_hash + ". English applicability is an explicit subject binding, not a separate legal instrument or SME approval."),
        dict(common, id=programme_doc_id, source_key="am_foreign_languages_grade7_programme_116n_english",
             document_type="grade_programme", grade_id=programme["grade_id"],
             title_hy="«Օտար լեզուներ» բնագավառի 7-րդ դասարանի ծրագիր՝ անգլերենի կիրառությամբ",
             title_en="Foreign languages Grade 7 programme — English applicability",
             legal_identifier="N 116-Ն", current_amendment_identifier=None,
             version_label="N 116-Ն, in force from 3 October 2023; Grade 7 and English grammar scope",
             official_url="https://www.arlis.am/hy/acts/183356", adopted_on="2023-09-29",
             effective_from="2023-10-03",
             notes="Source identity and current status verified technically. Grade 7 Topic 1 plus the annual English grammar list; not the Grade 2 programme. Topic locators K/L are local indices, not official outcome codes."),
    ]
    inserts["subject_program_source_bindings"] = [{
        "subject_program_id": programme_id, "framework_document_id": framework["id"],
        "subject_standard_document_id": standard_id, "programme_document_id": programme_doc_id,
        "applicability_status": "governing", "fixture_reason": None, "reviewed_by": None,
        "notes": "C20 automated source-applicability reconciliation. English Grade 7 governing chain is explicit; no human approval, content publication or release activation.",
    }]
    inserts["topics"] = [{
        "id": topic_id, "unit_id": unit_id, "code": "ENG7-T1",
        "title_hy": "Ոճ և նորաձևություն", "title_en": "Style and fashion",
        "sequence_order": 1, "status": "review",
    }]
    definitions = [
        ("K1", "թեմային առնչվող բառապաշարը,", "Vocabulary related to the topic.", "automatic_sample", [], "S01 and contextual word-formation support in S02; vocabulary is a support for communication, not a full communication descriptor."),
        ("K2", "տեղեկություններ նորաձևության մեջ ճանաչված դիզայներների մասին։", "Information about recognised designers in fashion.", "reading_support", ["ՕԼ7-Հ-Ը․1", "ՕԼ7-Մ-Ն․2"], "Supplied designer/cultural information supports this knowledge outcome. Reading questions are not independent evidence of broad fashion-history knowledge."),
        ("K3", "տրված քերականական նյութը։", "The grammar taught in the topic.", "automatic_sample", [], "Apply the annual English list within the textbook Unit 1 scope. Reported orders/requests are included; broader reported statements/questions are not silently made mandatory. S04 is supporting groundwork."),
        ("L1", "լսել և հասկանալ «Ոճ և նորաձևություն» թեմայով մեդիա հաղորդումների հիմնական իմաստը,", "Listen to and understand the main meaning of media about style and fashion.", "automatic_listening_sample", ["ՕԼ7-Հ-ՈՒ․1", "ՕԼ7-Հ-ՈՒ․3"], "S11 samples main meaning; S12 provides supporting detail/speaker evidence. Familiar/publicly exposed sources are not claimed unseen."),
        ("L2", "կարդալ և հասկանալ «Ոճ և նորաձևություն» թեմայով տեղեկատվական տեքստերի հիմնական բովանդակությունը,", "Read and understand the main content of informational texts about style and fashion.", "automatic_reading_sample", ["ՕԼ7-Հ-Ը․1"], "S09–S10 sample main content and supported details/relations. Shared-passage responses are dependent evidence."),
        ("L3", "պարզ արտահայտություններով ներկայացնել նորաձևության մեջ իրեն հետաքրքրող զարգացումները,", "Use simple expressions to present developments in fashion that interest the learner.", "classroom_assessed", ["ՕԼ7-Հ-Մ․1"], "Oral production stays classroom-assessed. No platform skill, question, pass/fail or automatic denominator is created."),
        ("L4", "ներկայացնել նախապես պատրաստված ելույթ իր նախընտրած ոճի մասին,", "Present a prepared talk about a preferred style.", "classroom_assessed", ["ՕԼ7-Հ-Մ․3"], "Prepared oral presentation stays classroom-assessed. No platform speaking workflow is introduced."),
        ("L5", "տալ հարցեր նորաձևության, հագուստի ոճերի և իր նախընտրած ոճի մասին և պատասխանել այս թեմաներով իրեն ուղղված հարցերին,", "Ask and answer questions about fashion, clothing styles and a preferred style.", "classroom_assessed", ["ՕԼ7-Հ-Փ․1", "ՕԼ7-Հ-Փ․2"], "This unit's spoken exchange is excluded by the owner's speaking decision. The wider Փ․1 standard is not declared universally oral."),
        ("L6", "կազմել իր նախընտրած ոճը նկարագրող պարզ տեքստ (80 – 100 բառ),", "Compose a simple 80–100-word text describing a preferred style.", "teacher_reviewed_writing", ["ՕԼ7-Հ-Գ․1", "ՕԼ7-Հ-Փ․3"], "S13 directly addresses description. S14 supports the same note through a real written audience and the additional written-interaction descriptor Փ․3. One accepted response supplies both targets; it is not two independent samples. No automatic pass threshold is adopted."),
        ("L7", "դրսևորել նորաձևության նկատմամբ քննական վերաբերմունք՝ կարևորելով ինքնարտահայտումը անհատական ոճի միջոցով:", "Show a critical attitude to fashion while valuing self-expression through individual style.", "qualitative_support_only", ["ՕԼ7-Մ-Վ.1", "ՕԼ7-Մ-Հ/Ն․1", "ՕԼ7-ՔՍՄ-Մ․2", "ՕԼ7-ՔՍՄ-Տ․1"], "Reflection and reasons in S14 provide limited supporting evidence. Do not automatically score clothing preferences, personal values or character, or claim that one note establishes the full attitude outcome."),
    ]
    outcomes = {}
    for index, (loc, hy, en, route, standard_refs, note) in enumerate(definitions, 1):
        outcomes[loc] = {
            "id": identity("english7_u01_outcome_" + loc.lower()), "topic_id": topic_id,
            "official_code": None, "statement_hy": hy, "statement_en": en,
            "source_reference": "N 116-Ն · Grade 7 · Topic 1 · " + ("Knowledge " if loc[0] == "K" else "Language abilities ") + loc[1:],
            "sequence_order": index, "status": "review", "source_document_id": programme_doc_id,
            "source_locator": "Grade7.Topic1." + loc, "requirement_level": "mandatory",
            "source_transcription_notes": "Exact outcome bullet text and punctuation retained; numbering stored in source_locator. K/L are platform locators, not official codes. English is an explanatory translation. Knowledge bullets share the source stem 'should know'; language bullets share 'should be able to'.",
        }
    inserts["learning_outcomes"] = list(outcomes.values())
    inserts["curriculum_reconciliation_runs"] = [{
        "id": run_id, "reconciliation_key": "english7_u01_2026_08_14",
        "subject_program_id": programme_id, "unit_id": unit_id,
        "framework_document_id": framework["id"], "subject_standard_document_id": standard_id,
        "programme_document_id": programme_doc_id, "status": "complete",
        "source_snapshot": source_snapshot, "completed_at": now, "reviewed_by": None,
        "notes": "Technical curriculum traceability complete under C20. This is an author mapping, not independent SME approval, form qualification, policy adoption or learner activation. All ten official topic outcomes are retained; three oral outcomes remain classroom-assessed and L7 is qualitative supporting evidence only.",
    }]
    inserts["learning_outcome_normative_mappings"] = [{
        "reconciliation_id": run_id, "learning_outcome_id": outcomes[loc]["id"],
        "disposition": "new_official_outcome_missing",
        "framework_references": ["Հ4"], "subject_standard_references": refs,
        "mapping_notes": f"T1.{loc}; route={route}. {note} The missing official registry row is resolved by this import. Current framework reference is a semantic link to Annex 2, section 4, paragraph 10(4), not proof of the entire multi-language end-of-school outcome. Printed 2023 topic-level references remain separately preserved in source_snapshot. Automated author reconciliation; no independent reviewer.",
    } for loc, hy, en, route, refs, note in definitions]
    links = [
        ("S01", "K1", "direct", "Contextual clothing/style/personality vocabulary from Unit 1."),
        ("S02", "K3", "direct", "Taught word formation is explicitly included in the annual English grammar list."),
        ("S02", "K1", "derived_supporting", "Related words in topic context support the vocabulary outcome."),
        ("S03", "K3", "direct", "Reported orders and requests; no broader mandatory reported-speech claim."),
        ("S04", "K3", "derived_supporting", "Textbook adjective/adverb groundwork supports comparison and adverb use."),
        ("S05", "K3", "direct", "The annual English list explicitly includes -ed and -ing adjectives."),
        ("S06", "K3", "direct", "The annual English list explicitly includes too and enough."),
        ("S07", "K3", "direct", "Adjective/adverb comparison and taught intensifiers."),
        ("S08", "K3", "direct", "Special uses of a, an, the and zero article."),
        ("S09", "L2", "direct", "Main content and explicit details of supplied informational texts."),
        ("S10", "L2", "direct", "Supported chronology, contrast and cultural information in supplied texts."),
        ("S10", "K2", "derived_supporting", "Supplied designer profiles support cultural knowledge; not all S10 questions establish broad designer knowledge."),
        ("S11", "L1", "direct", "Main meaning of a short style/fashion recording."),
        ("S12", "L1", "derived_supporting", "Details and speaker views support main-meaning comprehension; not independent main-idea coverage."),
        ("S13", "L6", "direct", "The accepted 80–100-word preferred-style description is teacher-reviewed."),
        ("S14", "L6", "derived_supporting", "A real written audience and reasoned response extend the same note under ՕԼ7-Հ-Փ․3; one shared sample."),
        ("S14", "L7", "derived_supporting", "The explanation/reflection can support critical engagement; no automatic attitude or preference score."),
    ]
    inserts["skill_outcome_curriculum_mappings"] = [{
        "reconciliation_id": run_id, "skill_id": skills[code]["id"],
        "learning_outcome_id": outcomes[loc]["id"], "mapping_type": kind, "rationale": note,
    } for code, loc, kind, note in links]
    inserts["skill_outcomes"] = [{
        "skill_id": row["skill_id"], "learning_outcome_id": row["learning_outcome_id"]
    } for row in inserts["skill_outcome_curriculum_mappings"]]
    inserts["skill_curriculum_reconciliations"] = [{
        "reconciliation_id": run_id, "skill_id": skill["id"], "disposition": "mapping_updated",
        "rationale": "Current official programme mapping registered without changing the existing skill, approved material or learner evidence. " + " ".join(note for code, loc, kind, note in links if code == key),
    } for key, skill in sorted(skills.items())]
    # FK parents must precede their mappings.
    mappings = inserts.pop("skill_outcome_curriculum_mappings")
    legacy_links = inserts.pop("skill_outcomes")
    inserts["skill_outcome_curriculum_mappings"], inserts["skill_outcomes"] = mappings, legacy_links
    primary = {skills[code]["id"]: (loc, kind, note) for code, loc, kind, note in reversed(links) if code <= "S12"}
    inserts["item_family_curriculum_reconciliations"] = [{
        "reconciliation_id": run_id, "item_family_id": family["id"],
        "primary_learning_outcome_id": outcomes[primary[family["skill_id"]][0]]["id"],
        "disposition": "mapping_updated", "mapping_type": primary[family["skill_id"]][1],
        "rationale": primary[family["skill_id"]][2] + " Curriculum trace only; no independent coverage, exposure qualification or new content approval.",
    } for family in sorted(families, key=lambda f: f["code"])]
    normative = {r["learning_outcome_id"]: r for r in inserts["learning_outcome_normative_mappings"]}
    inserts["curriculum_release_outcomes"] = [{
        "curriculum_release_id": release_id, "learning_outcome_id": o["id"],
        "source_document_id": o["source_document_id"], "official_code_snapshot": o["official_code"],
        "statement_hy_snapshot": o["statement_hy"], "statement_en_snapshot": o["statement_en"],
        "source_locator_snapshot": o["source_locator"], "requirement_level_snapshot": o["requirement_level"],
        "source_transcription_notes_snapshot": o["source_transcription_notes"],
        "framework_references_snapshot": normative[o["id"]]["framework_references"],
        "subject_standard_references_snapshot": normative[o["id"]]["subject_standard_references"],
        "mapping_notes_snapshot": normative[o["id"]]["mapping_notes"],
        "sequence_order_snapshot": o["sequence_order"],
    } for o in outcomes.values()]
    inserts["curriculum_release_reconciliations"] = [{
        "curriculum_release_id": release_id, "reconciliation_id": run_id, "unit_id": unit_id,
    }]
    family_map = {f["id"]: f for f in families}
    inserts["curriculum_release_item_families"] = [{
        "curriculum_release_id": release_id, "item_family_id": row["item_family_id"],
        "skill_id": family_map[row["item_family_id"]]["skill_id"],
        "family_code_snapshot": family_map[row["item_family_id"]]["code"],
        "name_hy_snapshot": family_map[row["item_family_id"]]["name_hy"],
        "description_snapshot": family_map[row["item_family_id"]]["description"],
        "primary_learning_outcome_id": row["primary_learning_outcome_id"],
        "disposition_snapshot": row["disposition"], "mapping_type_snapshot": row["mapping_type"],
        "rationale_snapshot": row["rationale"],
    } for row in inserts["item_family_curriculum_reconciliations"]]
    recs = {s["skill_id"]: s for s in inserts["skill_curriculum_reconciliations"]}
    updated_skills = []
    for old in guard["releaseSkills"]:
        row = dict(old)
        row["disposition_snapshot"] = "mapping_updated"
        row["rationale_snapshot"] = recs[row["skill_id"]]["rationale"]
        row["outcome_mapping_snapshot"] = sorted([{
            "learningOutcomeId": m["learning_outcome_id"], "mappingType": m["mapping_type"], "rationale": m["rationale"],
        } for m in mappings if m["skill_id"] == row["skill_id"]], key=lambda x: x["learningOutcomeId"])
        updated_skills.append(row)
    registration_hash = digest({"insertRows": inserts, "updatedReleaseSkills": updated_skills})
    updated_release = dict(release)
    updated_release.update(
        reconciliation_id=run_id,
        source_snapshot={**release["source_snapshot"], "formalReconciliation": {
            "id": run_id, "manifestSha256": registration_hash, "checkpoint": "16.1C.20",
            "officialOutcomes": 10, "skillMappings": 17, "families": 200,
            "publicExposureDisposition": owner, "independentSmeApproved": False,
        }},
        content_fingerprint=digest({"previousFingerprint": release["content_fingerprint"], "registrationManifestSha256": registration_hash}),
        notes=release["notes"] + " C20 supersedes the formal-mapping-pending statement: source chain, ten topic outcomes, fourteen skills and 200 families are technically reconciled. Owner accepts continuing with the exposed bank for the provisional MVP. No independent SME approval, assessment-policy adoption or learner activation.",
    )
    packet = {
        "schemaVersion": "haiedu-english-unit-curriculum-registration-v1", "checkpoint": "16.1C.20",
        "date": "2026-10-22", "sourceCommitBeforeRegistration": captured["sourceCommit"],
        "scope": "Content-extension configuration; no shared core/schema/runtime change.",
        "registrationManifestSha256": registration_hash,
        "ownerExposureDecision": owner, "insertRows": inserts,
        "updatedReleaseSkills": updated_skills, "updatedRelease": updated_release,
        "counts": {"insertedRows": sum(map(len, inserts.values())), "updatedRows": 15,
                   "officialOutcomes": 10, "skills": 14, "skillOutcomeMappings": 17,
                   "families": 200, "classroomOnlyOutcomes": 3},
    }
    assert packet["counts"]["insertedRows"] == 484
    assert len(mappings) == 17 and len({m["skill_id"] for m in mappings}) == 14
    oral_ids = {outcomes["L" + str(i)]["id"] for i in (3, 4, 5)}
    assert not oral_ids.intersection({m["learning_outcome_id"] for m in mappings})
    for loc in ("L6", "L7"):
        assert outcomes[loc]["id"] not in {f["primary_learning_outcome_id"] for f in inserts["item_family_curriculum_reconciliations"]}
    args.manifest_output.parent.mkdir(parents=True, exist_ok=True)
    args.manifest_output.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
    build_sql(w, packet, baseline, release, guard["releaseSkills"])
    print(json.dumps({"prepared": True, **packet["counts"], "manifestSha256": registration_hash}))


def build_sql(w, packet, baseline, old_release, old_skills):
    rid = old_release["id"]
    insert_rows = packet["insertRows"]
    changed = set(insert_rows) | {"curriculum_releases", "curriculum_release_skills"}
    # Reference locks prevent catalogue changes between the freshness check and insert.
    locked = sorted(changed | {"skills", "item_families", "subject_programs", "units"})
    sql = [
        "-- C20: data-only curriculum registration. No role, approval, QA, score, policy or release-status change.",
        "begin;", "set local transaction isolation level read committed;",
        "set local lock_timeout='5s';", "set local statement_timeout='60s';",
        "lock table " + ", ".join("public." + t for t in locked) + " in share row exclusive mode;",
        "do $registration$",
        "declare g jsonb; n bigint; h text; old_hashes jsonb := '{}'::jsonb; rows_hash jsonb; missing bigint;",
        "begin",
        "for g in select value from jsonb_array_elements(" + literal(canonical(baseline)) + "::jsonb) loop",
        "execute format('select count(*),md5(coalesce(string_agg(to_jsonb(t)::text,%L order by to_jsonb(t)::text),%L)) from public.%I t','','',g->>'table_name') into n,h;",
        "if n<>(g->>'row_count')::bigint or h<>g->>'fingerprint' then raise exception 'C20 stale baseline: %',g->>'table_name'; end if;",
        "execute format('select coalesce(jsonb_agg(md5(to_jsonb(t)::text)),''[]''::jsonb) from public.%I t',g->>'table_name') into rows_hash;",
        "old_hashes := old_hashes || jsonb_build_object(g->>'table_name',rows_hash);",
        "end loop;",
        "if not exists (select 1 from public.curriculum_releases where id=" + literal(rid) + "::uuid and status='draft' and reconciliation_id is null and activated_at is null) then raise exception 'C20 release boundary changed'; end if;",
        "if exists (select 1 from public.assessment_blueprints where curriculum_release_id=" + literal(rid) + "::uuid) or exists(select 1 from public.learning_sessions where curriculum_release_id=" + literal(rid) + "::uuid) then raise exception 'C20 allocated or used release'; end if;",
    ]
    # Save full unrelated rows; only these two tables have intended in-place updates.
    for table, key in (("curriculum_releases", "id"), ("curriculum_release_skills", "curriculum_release_id")):
        sql += [
            "select coalesce(jsonb_agg(md5(to_jsonb(t)::text)),'[]'::jsonb) into rows_hash from public." + table + " t where " + key + "<>" + literal(rid) + "::uuid;",
            "old_hashes := old_hashes || jsonb_build_object(" + literal(table) + ",rows_hash);",
        ]
    for table, rows in insert_rows.items():
        columns = ",".join(rows[0])
        sql.append("insert into public." + table + "(" + columns + ") select " + columns + " from jsonb_populate_recordset(null::public." + table + "," + literal(canonical(rows)) + "::jsonb);")
    sql.append("update public.curriculum_release_skills t set disposition_snapshot=p.disposition_snapshot,rationale_snapshot=p.rationale_snapshot,outcome_mapping_snapshot=p.outcome_mapping_snapshot from jsonb_populate_recordset(null::public.curriculum_release_skills," + literal(canonical(packet["updatedReleaseSkills"])) + "::jsonb) p where t.curriculum_release_id=p.curriculum_release_id and t.skill_id=p.skill_id;")
    sql.append("get diagnostics n=row_count; if n<>14 then raise exception 'C20 expected fourteen skill snapshots'; end if;")
    sql.append("update public.curriculum_releases t set reconciliation_id=p.reconciliation_id,source_snapshot=p.source_snapshot,content_fingerprint=p.content_fingerprint,notes=p.notes from jsonb_populate_record(null::public.curriculum_releases," + literal(canonical(packet["updatedRelease"])) + "::jsonb) p where t.id=p.id;")
    sql.append("get diagnostics n=row_count; if n<>1 then raise exception 'C20 expected one draft release'; end if;")
    # Compare every explicit field of every inserted row independently of defaults.
    for table, rows in insert_rows.items():
        sql.append("select count(*) into missing from jsonb_array_elements(" + literal(canonical(rows)) + "::jsonb) p where not exists(select 1 from public." + table + " t where to_jsonb(t) @> p);")
        sql.append("if missing<>0 then raise exception " + literal("C20 exact row readback failed: " + table) + "; end if;")
    for table, rows in (("curriculum_release_skills", packet["updatedReleaseSkills"]), ("curriculum_releases", [packet["updatedRelease"]])):
        # updated_at is managed separately; all other old fields are preserved.
        rows = [{k: v for k, v in r.items() if k != "updated_at"} for r in rows]
        sql.append("select count(*) into missing from jsonb_array_elements(" + literal(canonical(rows)) + "::jsonb) p where not exists(select 1 from public." + table + " t where to_jsonb(t)-'updated_at' @> p);")
        sql.append("if missing<>0 then raise exception " + literal("C20 exact update failed: " + table) + "; end if;")
    sql += [
        "for g in select value from jsonb_array_elements(" + literal(canonical(baseline)) + "::jsonb) loop",
        "execute format('select coalesce(jsonb_agg(md5(to_jsonb(t)::text)),''[]''::jsonb) from public.%I t',g->>'table_name') into rows_hash;",
        "select count(*) into missing from jsonb_array_elements_text(old_hashes->(g->>'table_name')) x where not rows_hash ? x;",
        "if missing<>0 then raise exception 'C20 original rows changed: %',g->>'table_name'; end if;",
        "end loop;",
    ]
    counts = {table: len(rows) for table, rows in insert_rows.items()}
    for b in baseline:
        expected = b["row_count"] + counts.get(b["table_name"], 0)
        sql.append("select count(*) into n from public." + b["table_name"] + "; if n<>" + str(expected) + " then raise exception " + literal("C20 unexpected row count: " + b["table_name"]) + "; end if;")
    sql += ["end;", "$registration$;", "select jsonb_build_object('checkpoint','16.1C.20','insertedRows',484,'updatedRows',15,'guardedTables'," + str(len(baseline)) + ",'exactRowsVerified',true,'originalRowsPreserved',true,'releaseStatus','draft','contentApprovalActions',0,'qaRuns',0,'qualifiedForms',0) as evidence;"]
    base = "\n".join(sql) + "\n"
    (w / "registration-rollback.sql").write_text(base + "rollback;\n")
    (w / "registration-commit.sql").write_text(base + "commit;\n")


if __name__ == "__main__":
    main()
