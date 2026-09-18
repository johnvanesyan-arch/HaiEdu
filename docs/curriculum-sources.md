# Curriculum Sources — Grade 7 Physics

This document records authoritative and classroom sources used for the Grade 7 Physics implementation. The database-backed registry and applicability matrix are defined in `docs/sprint-11i-standards-source-registry.md`.

## 1. Current national framework

**Authority:** Government of the Republic of Armenia  
**Base decision:** N 439-Ն, 8 April 2010  
**Current amendment:** N 699-Ն, 21 May 2026  
**Current incorporated revision effective:** 22 May 2026

ARLIS official incorporation: `https://www.arlis.am/hy/acts/225446`

## 2. Current Physics subject standard

**Authority:** Ministry of Education, Science, Culture and Sport of the Republic of Armenia  
**Base order:** N 42-Ն, 30 March 2023  
**Current amendment:** N 37-Ն, 28 July 2026  
**Official publication of current amendment:** 13 August 2026  
**Current replacement appendix effective:** 14 August 2026  
**Scope:** Physics subject standard for Grades 7–12

ARLIS current amendment record and replacement appendix: `https://www.arlis.am/hy/acts/229259`

The registry stores N 42-Ն as the base legal identifier and N 37-Ն as the current amendment. N 37-Ն replaced the full appendix; it is not mislabeled as the original standard order.

## 3. Current Physics programme

**Authority:** Ministry of Education, Science, Culture and Sport of the Republic of Armenia  
**Base order:** N 40-Ն, 7 May 2024  
**Current amendment:** N 36-Ն, 28 July 2026  
**Official publication of current amendment:** 13 August 2026  
**Current incorporated programme effective:** 14 August 2026

ARLIS official incorporation: `https://www.arlis.am/hy/acts/229331`

N 36-Ն amended N 40-Ն, replaced its appendix with programmes for Grades 7–12 and repealed the earlier N 51-Ն and N 85-Ն programme orders.

### Implementation rule

All official Grade 7 outcomes must be taken from the current incorporated programme. Earlier programme versions may be used only as historical/reference material, with that status made explicit.\n\nThe current programme appendix prints mandatory outcome 1(5)'s cross-reference as `(Հ4, 28)`. The database and crosswalk preserve that form exactly and attach an editorial transcription note rather than inferring a missing `Հ`.

## 4. Pilot-class textbook

**Title:** Ֆիզիկա 7  
**Authors:** Գագիկ Մելիքյան, Սոս Մաիլյան  
**Editor:** Prof. Eduard Ghazaryan  
**Publisher:** Էդիթ Պրինտ  
**Year:** 2023  
**Printed length:** 168 pages

The complete chapter/section map is recorded in `docs/grade7-physics-textbook-map.md`.

## 5. Sprint 11J extraction and reconciliation record

On 2026-09-18, Sprint 11J extracted the current ARLIS-linked DOCX appendices, verified their hashes and stored the six exact Grade 7 Theme 1 outcomes.

- standard attachment SHA-256: `619a30f43ca972d138e738dbfff0797d17f8bb12ff533894490b88af99537397`;
- programme attachment SHA-256: `966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478`;
- reconciliation key: `physics7_u01_2026_08_14`.

The detailed outcome/skill/item-family/blueprint crosswalk is in `docs/sprint-11j-physics7-current-standard-reconciliation.md`.

## Source hierarchy

1. Armenian General Education State Standard
2. Current Physics subject standard
3. Current Grade 7 Physics programme
4. Approved/current classroom textbook
5. SME classroom knowledge
6. Platform skill decomposition and item design
7. PISA-inspired application / transfer / reasoning design

The first three layers are normative. The textbook is instructional/navigation material; SME knowledge and other references are supplementary. If any lower layer differs from an official programme outcome, the normative source remains authoritative.
