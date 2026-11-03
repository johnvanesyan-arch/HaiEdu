-- Capture new published versions at transaction commit, after options/keys exist.
-- This helper is service-only, uses the caller's privileges and exposes no new API.
create or replace function private.current_item_version_snapshot(p_item uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('item',to_jsonb(i),'options',coalesce((select jsonb_agg(to_jsonb(o) order by o.display_order,o.option_key) from public.item_options o where o.item_id=i.id),'[]'::jsonb),'answerKey',(select to_jsonb(k) from public.item_answer_keys k where k.item_id=i.id),
 'misconceptions',coalesce((select jsonb_agg(jsonb_build_object('responseKey',m.response_key,'mappingNote',m.mapping_note,'code',mc.code) order by mc.code,m.response_key) from public.item_misconception_mappings m join public.misconceptions mc on mc.id=m.misconception_id where m.item_id=i.id),'[]'::jsonb))
 from public.items i where i.id=p_item;
$$;
-- Assessment fields reconstructed from the pinned legacy sources. Operational
-- review/config/timestamps are deliberately not presented as recovered history.
create or replace function private.item_snapshot_assessment_content(p_snapshot jsonb)
returns jsonb language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('item',jsonb_build_object(
 'id',p_snapshot#>'{item,id}','code',p_snapshot#>'{item,code}','version_no',p_snapshot#>'{item,version_no}',
 'skill_id',p_snapshot#>'{item,skill_id}','item_type',p_snapshot#>'{item,item_type}',
 'prompt_hy',p_snapshot#>'{item,prompt_hy}','prompt_en',p_snapshot#>'{item,prompt_en}',
 'stimulus',p_snapshot#>'{item,stimulus}','difficulty',p_snapshot#>'{item,difficulty}'),'options',coalesce((
 select jsonb_agg(jsonb_build_object('option_key',o->'option_key','content_hy',o->'content_hy','display_order',o->'display_order') order by (o->>'display_order')::integer,o->>'option_key') from jsonb_array_elements(p_snapshot->'options') o),'[]'::jsonb),
 'answerKey',jsonb_build_object('answer',case when jsonb_typeof(p_snapshot#>'{answerKey,answer}')='number'
   then to_jsonb(trim_scale((p_snapshot#>>'{answerKey,answer}')::numeric)) else p_snapshot#>'{answerKey,answer}' end,
 'tolerance',case when jsonb_typeof(p_snapshot#>'{answerKey,tolerance}')='number'
   then to_jsonb(trim_scale((p_snapshot#>>'{answerKey,tolerance}')::numeric)) else p_snapshot#>'{answerKey,tolerance}' end,
 'canonical_unit',p_snapshot#>'{answerKey,canonical_unit}','accepted_units',p_snapshot#>'{answerKey,accepted_units}'));
$$;

-- Bounded historical recovery. Existing snapshots and learning records remain unchanged.
do $recovery$
declare manifest jsonb := $manifest${
  "schemaVersion": "item-snapshot-recovery-v1",
  "scope": "physics7_u01_2026_08_14_pilot_r1",
  "sources": [
    {
      "path": "supabase/migrations/0015_sprint_11c_deterministic_variants.sql",
      "sha256": "df29cf7a9bd5497356c28047ba9b8ff6b297bfb329549872bd46809c43e2bf37"
    },
    {
      "path": "supabase/migrations/0017_sprint_11d_conceptual_bank_expansion.sql",
      "sha256": "e3bb8b1bab0aa59bd96c1312423c9c26f1dee1c22ab9f5f3861c447072d99e12"
    },
    {
      "path": "supabase/migrations/0024_sprint_11d_partial_state_recovery.sql",
      "sha256": "e530c70f1e0cedf8400704e532cf99c509043061e2898619d4f4af6e7399bf09"
    },
    {
      "path": "supabase/migrations/0026_sprint_11d_complete_candidate_bank.sql",
      "sha256": "78aa4559b6ce051b5dc55d5d5c038d488ec00ababf01ae6a12607b54c45493df"
    }
  ],
  "entries": [
    {
      "itemId": "108ed9fd-e2ea-4a35-b9ea-408864c4c22c",
      "code": "PHY7-U01-S01-11D-D01",
      "version": 1,
      "assessmentHash": "d6c1b2c768170e0b0c9fab6b5c8a619e",
      "fingerprint": "6d987a0998fd3c3ed17be42e7a931496",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "82678c9e-1b8a-44a4-a866-35d1788135a6",
      "code": "PHY7-U01-S01-11D-D02",
      "version": 1,
      "assessmentHash": "d40342c656a2758008c9f87979f5e605",
      "fingerprint": "e46770945fca42905728decdb66edacd",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "2458f2c9-f15f-463e-b1b6-28a8cb55e393",
      "code": "PHY7-U01-S01-11D-D03",
      "version": 1,
      "assessmentHash": "4157acc047de81bf632dda4b580e79ec",
      "fingerprint": "051981ef4a2952571d1fb00efcbdb69e",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "63fe19c5-777e-4c7c-bd71-8ebde297d1cb",
      "code": "PHY7-U01-S01-11D-D04",
      "version": 1,
      "assessmentHash": "e9adc61f20e54024d986886bfbf4c6ab",
      "fingerprint": "d482fd9b72ee1c603b624576776faeed",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "41945335-bd9e-42f3-850a-d5a4fd27559d",
      "code": "PHY7-U01-S01-11D-M01",
      "version": 1,
      "assessmentHash": "b39395915cc23704233597079a80e2e0",
      "fingerprint": "6b4a2f34dff80c46d17ea6fff04c5fa3",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "3e5e79c1-ab5c-4071-aecf-c8a621ea80ce",
      "code": "PHY7-U01-S01-11D-M02",
      "version": 1,
      "assessmentHash": "0f475b531d9e8daf46d6a5ade28a886b",
      "fingerprint": "ee5d1a28de6ce8f131e8fbdfcf36c7cc",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "6a261300-2546-4ed7-89f4-624694f69494",
      "code": "PHY7-U01-S01-11D-M03",
      "version": 1,
      "assessmentHash": "3d828768c0e890029fec9d66f0d6bb02",
      "fingerprint": "35e1c9b0c38e4d3e7083d62be10230f4",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "317b597c-6f12-41cf-b573-178a3ec624a4",
      "code": "PHY7-U01-S01-11D-M04",
      "version": 1,
      "assessmentHash": "fec370f014bc2cf83d8ca1c64d2c6b21",
      "fingerprint": "17ae20f869f3f3128a2507a05a6f4d6a",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "a671a767-0e47-4eca-8599-7c4b02fc6ea9",
      "code": "PHY7-U01-S01-11D-M05",
      "version": 1,
      "assessmentHash": "c480c43b2d2a2dccdbbbe479ec43447d",
      "fingerprint": "441fb626a4de3561091f7d3ca801d7cc",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "db7db7a9-7dba-4513-8969-e3badda35148",
      "code": "PHY7-U01-S01-11D-M06",
      "version": 1,
      "assessmentHash": "f6df991b0bbadfa5d4bba4738956f8f2",
      "fingerprint": "477d019d4553853a530de734cc60a838",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "e4e0a65e-dd3c-4d40-8ed4-2ea139081e13",
      "code": "PHY7-U01-S01-11D-P01",
      "version": 1,
      "assessmentHash": "8177aa96898f5e52f6922a33895e1029",
      "fingerprint": "8a9b92198feb0a4426c64d6dbef5b50a",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "99c42420-396d-4346-8ec8-c0b20a21b09d",
      "code": "PHY7-U01-S01-11D-P02",
      "version": 1,
      "assessmentHash": "4e508e822ca8b1ee0764f9cbba0b8d46",
      "fingerprint": "7fbdd2883f71917c9eaec90b583ddbff",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "3155d671-270b-4a9a-bc33-33e5604d3c2d",
      "code": "PHY7-U01-S01-11D-P03",
      "version": 1,
      "assessmentHash": "fa58169e8fdb5a9ec4342cbe8212d352",
      "fingerprint": "bb81fdea02b0df4e221b63c0591a5da3",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "bf3889df-4253-4954-b4ea-a70b7496b240",
      "code": "PHY7-U01-S01-11D-P04",
      "version": 1,
      "assessmentHash": "fb7a1983c770de49f9b240d208e009a9",
      "fingerprint": "d8d6cf0f581492b3014e74309d033482",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "38991c90-18e8-4ab4-83f3-3796723f5b3c",
      "code": "PHY7-U01-S01-11D-P05",
      "version": 1,
      "assessmentHash": "430d0397bdb3661cdfaa22392f88581b",
      "fingerprint": "0b4c83b807f39b73b39e4979bb3614f8",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "15f79dc9-8f67-49be-99de-8749bf2693ca",
      "code": "PHY7-U01-S01-11D-P06",
      "version": 1,
      "assessmentHash": "20b8902ea567c7caf020318993ee9761",
      "fingerprint": "e9891f18eb2e48f9a821cdfa9a2dbf85",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "5a145992-16ca-45f3-a81a-b7dbe9c81b52",
      "code": "PHY7-U01-S01-11D-P07",
      "version": 1,
      "assessmentHash": "556acee83817f193659dcbd0f1203419",
      "fingerprint": "eddff10443a6600cc468634e967037d2",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "fdc1cbeb-d4b0-40b2-abbc-5cb482aee12f",
      "code": "PHY7-U01-S01-11D-P08",
      "version": 1,
      "assessmentHash": "3cef7203e27c800a32812f51691f2439",
      "fingerprint": "30e946df31e2779974da05230d59420d",
      "templateId": "6fc8ce96-667d-4358-90b0-377f04e5dcb0",
      "sourceInputs": {
        "skillId": "cebf3c89-a0ce-4fd7-baf0-dd7a40873ec0",
        "skillCode": "PHY7-U01-S01",
        "templateCode": "PHY7-U01-S01-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "a4864469-802e-4e10-9c02-07bf15854e5f",
      "code": "PHY7-U01-S02-11D-D01",
      "version": 1,
      "assessmentHash": "96d66a1d627e54335360a14f314fefda",
      "fingerprint": "cd945b3c16b36b76faae251d03948d88",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "4a61515b-d795-49c5-9e99-0ec36cf90dda",
      "code": "PHY7-U01-S02-11D-D02",
      "version": 1,
      "assessmentHash": "301fd6a05a722daedc575e48f89bc7a7",
      "fingerprint": "022eca3723a36a8a91b1cf98e2042b87",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "2919bef2-d4df-4185-bb64-3a02534138f3",
      "code": "PHY7-U01-S02-11D-D03",
      "version": 1,
      "assessmentHash": "d679d499a126a52920642c099a4271d4",
      "fingerprint": "70d9b28c38e1c85d607722c4fd59640a",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "fc5d98d8-fe3d-4999-9156-fecd639df707",
      "code": "PHY7-U01-S02-11D-D04",
      "version": 1,
      "assessmentHash": "9e063cd922394135aef87496b105cd89",
      "fingerprint": "07059ad08cf5406141000789747a774f",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "d39231e6-17ba-4cef-bf6b-b26cea3271d2",
      "code": "PHY7-U01-S02-11D-M01",
      "version": 1,
      "assessmentHash": "ff1ef94b2b7bf1eca8a55393690f920b",
      "fingerprint": "cdbb33ee62e451e7095bc51994b628b3",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "5754c863-16b3-4c53-9f2f-50053138f075",
      "code": "PHY7-U01-S02-11D-M02",
      "version": 1,
      "assessmentHash": "bf6f95157f311f1e932f7d44c384d197",
      "fingerprint": "4421e1d00159726a599ca4a7869f60af",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "efadd5d3-93b1-4567-9854-4ada81d73783",
      "code": "PHY7-U01-S02-11D-M03",
      "version": 1,
      "assessmentHash": "622e81db9f049cc8c1a16265a0510b5b",
      "fingerprint": "996de330817d5646d74fa27086ee41d9",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "2a8c03d3-dc28-440d-bd9b-a68a538b591d",
      "code": "PHY7-U01-S02-11D-M04",
      "version": 1,
      "assessmentHash": "4c834d9ce4b2fb0ed6cb75064c4c45be",
      "fingerprint": "6ac427fa8ae7c4e08e42c9916a8ca06a",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "23ae8676-f508-4e7e-b2f2-3a56dfb3de99",
      "code": "PHY7-U01-S02-11D-M05",
      "version": 1,
      "assessmentHash": "f809def0ed8da2291e9c7c8f0c304bdf",
      "fingerprint": "78dae024a54a344735ce01c825872e63",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "d04ffaa5-d211-46b6-945a-7ec97a515f06",
      "code": "PHY7-U01-S02-11D-M06",
      "version": 1,
      "assessmentHash": "2fbb8e66a943b82e3216a077e452c1d3",
      "fingerprint": "e9912cdc2f6f97860e6f45dbfe934dfd",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "7d1a282f-2628-44e3-91f4-1ba83de4d392",
      "code": "PHY7-U01-S02-11D-P01",
      "version": 1,
      "assessmentHash": "621999c346671771df8a8c9b25de7ddf",
      "fingerprint": "60167a1a62241bbfc694fc791793fcc5",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "69ed219d-0afb-4d6f-afb5-f2190b89c925",
      "code": "PHY7-U01-S02-11D-P02",
      "version": 1,
      "assessmentHash": "0aa4202bf7e7bc9d7ed7c02efe87e743",
      "fingerprint": "dc09736e22ef2fb5ab392538d688c622",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "10025bb5-f92b-4b34-a075-8a800a12eee5",
      "code": "PHY7-U01-S02-11D-P03",
      "version": 1,
      "assessmentHash": "d4e13efa1f1b26424bf83d3b26838044",
      "fingerprint": "83fe5291222b796e3d61c412e61d0ec0",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "dc31a7dc-71ae-42b9-bb2b-3276731610f2",
      "code": "PHY7-U01-S02-11D-P04",
      "version": 1,
      "assessmentHash": "4b72801133966dcb542b09ec36319d39",
      "fingerprint": "9016a6f1ecd814ad767e7060cb24531f",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "b86511a5-5476-40d3-be17-e80a7cc92831",
      "code": "PHY7-U01-S02-11D-P05",
      "version": 1,
      "assessmentHash": "2fa0a4cb66901112f71a4b24f9dbc904",
      "fingerprint": "6dc1f1b0f750e067e7389c7c736ca42a",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "f53a9642-0868-4012-a75e-1c4dc2483bce",
      "code": "PHY7-U01-S02-11D-P06",
      "version": 1,
      "assessmentHash": "61b41b201259c9b46d36ef42205ecd8c",
      "fingerprint": "d2d86b2aec1317ad449bb6c36d3a9809",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "a59e2655-b7ba-49e1-aa8d-ebe169f0f30f",
      "code": "PHY7-U01-S02-11D-P07",
      "version": 1,
      "assessmentHash": "37d1f38adebc4f98e1085770d97ac900",
      "fingerprint": "759b4d3fc8b2b996d7a1fe6c122918f9",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "01d59b6e-1bd3-4899-91a3-7119a124fdb0",
      "code": "PHY7-U01-S02-11D-P08",
      "version": 1,
      "assessmentHash": "b13292e9c78d705a243f3a081b592f5f",
      "fingerprint": "0f59d08d224efd5c3b4810f56e895cb1",
      "templateId": "369fe1a2-829d-426b-9a6f-ca9998b463a8",
      "sourceInputs": {
        "skillId": "6c636713-3507-44ce-9d96-aec69372cfa9",
        "skillCode": "PHY7-U01-S02",
        "templateCode": "PHY7-U01-S02-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "b45cadbd-5549-491b-a67f-2388f29d8c75",
      "code": "PHY7-U01-S03-11D-D01",
      "version": 1,
      "assessmentHash": "c4119c1498ac66b7fa25db71e94a2949",
      "fingerprint": "82433c52aa62e28810f33ad45c576674",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "5eb88dbb-49c4-44db-b2f9-23c3898834c0",
      "code": "PHY7-U01-S03-11D-D02",
      "version": 1,
      "assessmentHash": "9191e53bffea506f55a53c936873d7ac",
      "fingerprint": "aaa01c875e34028957e62597fea821b8",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "1e080a2c-31c9-43d7-9e53-cf2470a9263e",
      "code": "PHY7-U01-S03-11D-D03",
      "version": 1,
      "assessmentHash": "a384bc98a2229f8af81d47d307f01c46",
      "fingerprint": "4893696d00ef1b585233fecb32405ac9",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "f8a57252-3f48-4ce1-b5d5-bdf4c41377e6",
      "code": "PHY7-U01-S03-11D-D04",
      "version": 1,
      "assessmentHash": "c7a92c8388deca171efd6a8c057287ed",
      "fingerprint": "9a38bed2a1741b84f3deceed938b1538",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "03d462b7-5e9b-449b-8f44-4c3632270008",
      "code": "PHY7-U01-S03-11D-M01",
      "version": 1,
      "assessmentHash": "ed360547572ce543715082265f9e712c",
      "fingerprint": "1870db44638e63d966b5c9dc3544840f",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "4bae1236-c84c-40c6-9994-b476711d1e14",
      "code": "PHY7-U01-S03-11D-M02",
      "version": 1,
      "assessmentHash": "dbdeaffc5f4ffe31f244d8c26057873a",
      "fingerprint": "9b1b48dc7a4590817306d2ab6e61c171",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "c69c3fa3-f554-47ab-ab65-c9755e8068ee",
      "code": "PHY7-U01-S03-11D-M05",
      "version": 1,
      "assessmentHash": "2a54788290d43c00efaaf9547a3128e1",
      "fingerprint": "c719c6bd28b654245b6cd10c22e99487",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "904d2f6b-e6fd-4ed3-b98f-cc95c4860c4a",
      "code": "PHY7-U01-S03-11D-M06",
      "version": 1,
      "assessmentHash": "d70b84b399bd08c77334c86037d2c408",
      "fingerprint": "541763922f73a369749f3ebf8d3c28ec",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "633b25fb-4af5-4fa3-97ea-d61c523ca9bf",
      "code": "PHY7-U01-S03-11D-P01",
      "version": 1,
      "assessmentHash": "75a0ba10e05d36d75bb8628349d4477f",
      "fingerprint": "00a0dfaf2aff942b16d73ef2d1c7cbf6",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "63d4e1b2-b645-4723-b5de-36cddaf9626c",
      "code": "PHY7-U01-S03-11D-P02",
      "version": 1,
      "assessmentHash": "eba9d00436b23ed76c84b04d6fec29fa",
      "fingerprint": "beb8c91bdea5dd5ecb21f28439842665",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "68a3a537-7bd3-4277-a547-8682842e29ce",
      "code": "PHY7-U01-S03-11D-P03",
      "version": 1,
      "assessmentHash": "18d73b9a2c0fdfdd629917cdb94e022c",
      "fingerprint": "72e5b069e14d53d4e87f551eb7d0d54a",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "836395c5-93e9-4f81-bb51-d018b2bc451c",
      "code": "PHY7-U01-S03-11D-P04",
      "version": 1,
      "assessmentHash": "109d57f0bd64c8c95ac32499725fe7e0",
      "fingerprint": "6812615f3fb978bf62379005902458d3",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "9806ca78-54ed-45ec-901e-2352527f079a",
      "code": "PHY7-U01-S03-11D-P05",
      "version": 1,
      "assessmentHash": "fc73c334425f794b53fffd1356abd57f",
      "fingerprint": "32ed5a2dc317dfb9022f7eccd2828319",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "09034544-76eb-4da4-87f1-dc4d90eca431",
      "code": "PHY7-U01-S03-11D-P06",
      "version": 1,
      "assessmentHash": "224d032289a458716aa2cf477a62085d",
      "fingerprint": "0d3806a18faa969ce80fed7aafc3a706",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "75937617-7d25-4233-b6a1-51b1cd4c9e1b",
      "code": "PHY7-U01-S03-11D-P08",
      "version": 1,
      "assessmentHash": "c416c31f37ac4ccea3ec78edb9e67c34",
      "fingerprint": "06b19558d0779e549db4507d104d0bb0",
      "templateId": "37611830-bac9-486a-9e8b-b4b24f834700",
      "sourceInputs": {
        "skillId": "fedbe115-0107-4843-991f-1d82f922d5c7",
        "skillCode": "PHY7-U01-S03",
        "templateCode": "PHY7-U01-S03-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "819720fa-2b2c-4335-bf6a-aa2915706d07",
      "code": "PHY7-U01-S04-11D-D01",
      "version": 1,
      "assessmentHash": "06c65f4c8be90e9c4e6d93d2d5964c95",
      "fingerprint": "c66f0073fe699b7582927c2ec5932be9",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "d8fb86e3-9ba8-441a-bb63-ce20e04977f5",
      "code": "PHY7-U01-S04-11D-D02",
      "version": 1,
      "assessmentHash": "86129e85d2549222e28c8631b0f6fad3",
      "fingerprint": "9f7294aa58707073fa3acb7b9023142e",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "f093d4b1-854a-43ef-a410-14c9db09e5bd",
      "code": "PHY7-U01-S04-11D-D03",
      "version": 1,
      "assessmentHash": "915b017c1712ac3889779467f3afd12c",
      "fingerprint": "1677fb17332ff4c84ea26e49c7e1c934",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "c18747da-01be-468a-b465-82abb51a8419",
      "code": "PHY7-U01-S04-11D-D04",
      "version": 1,
      "assessmentHash": "86ff1067bc681cbd76394296a43ee6c9",
      "fingerprint": "4f963c5b28a194a463ad03edbec2dfd3",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "b6ae2bb8-c3fd-4c25-b7cf-e8410a1dcfc5",
      "code": "PHY7-U01-S04-11D-M01",
      "version": 1,
      "assessmentHash": "9de03088cfe020b82f61e7a556af6608",
      "fingerprint": "d5fa3ba91f414ab43935a9eb66a55c26",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "281ca4cf-11ac-4cac-996b-d6b33b5482f8",
      "code": "PHY7-U01-S04-11D-M02",
      "version": 1,
      "assessmentHash": "390d1ea2f4de6a3331e5539b422b0023",
      "fingerprint": "d22e149e5b91ed6ef346c29993df42bd",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "1d6787b1-bb5a-4543-b2c4-4da469c46be3",
      "code": "PHY7-U01-S04-11D-M03",
      "version": 1,
      "assessmentHash": "546db2b2f2115339b7ed57174c41e196",
      "fingerprint": "a3c530a8efde7099ad0bcd26ae0140a4",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "d857cc97-3e92-4f39-a7e1-39ae14ee68d4",
      "code": "PHY7-U01-S04-11D-M04",
      "version": 1,
      "assessmentHash": "e1b0fe1ff5159d8925429083a6d5419d",
      "fingerprint": "b3ea1697d5a4718e10c1652529cef0f0",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "d3571945-baaa-40da-99f4-e049506d2252",
      "code": "PHY7-U01-S04-11D-M05",
      "version": 1,
      "assessmentHash": "5a6fea6bc847ec0748d0d5b80fb08983",
      "fingerprint": "c64ea4228ca1d5d64193dfd1300c6d9b",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "cf05b804-f097-4435-9f49-9a9c2a3fe414",
      "code": "PHY7-U01-S04-11D-M06",
      "version": 1,
      "assessmentHash": "2268c6035e1c1d06c9e8266ae7a729c1",
      "fingerprint": "4c28d0952eb3271547cc0339c20e65c9",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "456b8546-0d61-466b-9657-dd73a2d7df73",
      "code": "PHY7-U01-S04-11D-P01",
      "version": 1,
      "assessmentHash": "12ab57546ac097110fe5172f1d9f703d",
      "fingerprint": "dc278894e95b04ac6234800d2b6d6cd2",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "507bb9f8-1555-4a98-9907-0f5ffeca2d75",
      "code": "PHY7-U01-S04-11D-P02",
      "version": 1,
      "assessmentHash": "2c4b659b90a503c6150d99ff366c910d",
      "fingerprint": "b070a74b4bf867d275674f4c39a7bdf7",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "04c6e33a-e730-458f-ba52-3664bae537b9",
      "code": "PHY7-U01-S04-11D-P03",
      "version": 1,
      "assessmentHash": "cd05bdc21fe595b648aded110c1a85ac",
      "fingerprint": "796c3ac486e1c3e0ef1b869d2d541070",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "76f66f6d-48bf-46e1-b490-babb8acf5324",
      "code": "PHY7-U01-S04-11D-P04",
      "version": 1,
      "assessmentHash": "34dfa4ca9a803706a4f7bb73095d0839",
      "fingerprint": "57256f672b30c611ad97add006a18fb2",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "b81791dc-4558-4d77-9b84-7fad7c6bc975",
      "code": "PHY7-U01-S04-11D-P05",
      "version": 1,
      "assessmentHash": "579f7e8f690ce3c29f6f52119e676c1d",
      "fingerprint": "3fcf21a59a692365fba5da3175ae6c28",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "92211425-ef7b-449a-b9e8-0c8414694ee7",
      "code": "PHY7-U01-S04-11D-P06",
      "version": 1,
      "assessmentHash": "461e3176dfd4c269ffd52acb73771843",
      "fingerprint": "eeec3856b96042040bd4d2976cff25e5",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "1a15fd8b-bccb-4b6c-8ce7-e2715701ce18",
      "code": "PHY7-U01-S04-11D-P07",
      "version": 1,
      "assessmentHash": "49a17fc05e53b5029bfb9a957ae2e74b",
      "fingerprint": "1c898f45ba5152a421f28ef4cddd98e0",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "09f72434-7472-41de-bc87-71838c58b07f",
      "code": "PHY7-U01-S04-11D-P08",
      "version": 1,
      "assessmentHash": "789269e4d04da6ea83106beb4cc59353",
      "fingerprint": "914adf576c2eb4a9416c5f8c070abd40",
      "templateId": "aeab8b45-8959-4f1a-9264-82006e1667a8",
      "sourceInputs": {
        "skillId": "44a09bd7-15e0-470b-94dc-7057a703f96e",
        "skillCode": "PHY7-U01-S04",
        "templateCode": "PHY7-U01-S04-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "0d7ff503-45af-495c-885b-9c172e4c3e2d",
      "code": "PHY7-U01-S05-11D-D01",
      "version": 1,
      "assessmentHash": "5190601c71f524ebf6ca4f32e0f5d3ea",
      "fingerprint": "d07041ff487df6a6764dfa11d46cafd7",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "b27d43ab-e4c1-44a1-a423-2d36a81868fe",
      "code": "PHY7-U01-S05-11D-D02",
      "version": 1,
      "assessmentHash": "7d5d31993b1eab42401f05b009ca4add",
      "fingerprint": "26f701818733a82f87bc93c1b24066b6",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "61762fca-6fec-4cb8-989c-af849a11dc47",
      "code": "PHY7-U01-S05-11D-D03",
      "version": 1,
      "assessmentHash": "eadac43ee05733882ef1f18b9f6ef52b",
      "fingerprint": "878e5f74e68dd3a585a0b439ff4396e5",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "52a4c2e9-2240-4578-96ea-10870d60a7da",
      "code": "PHY7-U01-S05-11D-D04",
      "version": 1,
      "assessmentHash": "815aff87a97061c6d39322e2b81a0b52",
      "fingerprint": "69162eac1f793d06929fa1faa7b539de",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "1b1422e9-5341-439f-9e90-ad3e3f03c7fc",
      "code": "PHY7-U01-S05-11D-M01",
      "version": 1,
      "assessmentHash": "d0dd29bf6b7d62e6a3f9a2803251ac6c",
      "fingerprint": "125adbcf7d871bd5f99eb86b1858c300",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "da8dd0a1-8e07-42ac-8459-93a499231a72",
      "code": "PHY7-U01-S05-11D-M02",
      "version": 1,
      "assessmentHash": "9d848327867c4e3db6365330b6fdcc4a",
      "fingerprint": "db1a20acf814042cde4ef627c4983d66",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "b348469d-60e5-49c5-9c67-6a38f5b7515d",
      "code": "PHY7-U01-S05-11D-M04",
      "version": 1,
      "assessmentHash": "41c8e7e062eb1a4b62bf514911afaec2",
      "fingerprint": "5724e94374ace0a0e8060883627b13a5",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "940555bf-74ff-45ba-899f-62409daab88e",
      "code": "PHY7-U01-S05-11D-M05",
      "version": 1,
      "assessmentHash": "5229006f83cb5985ccc42decb0b0b7c6",
      "fingerprint": "bfe0cd30ba27885e3e301f6d886a1eca",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "4638308a-7a4d-4eae-a0b7-436c913a81ba",
      "code": "PHY7-U01-S05-11D-M06",
      "version": 1,
      "assessmentHash": "6828fa62e88396abcfaba5d3b384f0b1",
      "fingerprint": "89a73b4ed9065b8470cb555776a4e57e",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "186d60bf-784d-4a98-8a3d-19eb4c28ce5d",
      "code": "PHY7-U01-S05-11D-P01",
      "version": 1,
      "assessmentHash": "20ac0aae6d42b8d5fc2126d1ed385bab",
      "fingerprint": "c39fd01a917800305cb0366852b985f1",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "8c60514d-f1d9-453a-a0ba-ab082dcfc9da",
      "code": "PHY7-U01-S05-11D-P02",
      "version": 1,
      "assessmentHash": "1fc2b442e57048c5886dfe0c360c57eb",
      "fingerprint": "2cc4b2a6f2864a34b09fff093d5e9d5d",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "3983318f-af57-45af-b071-98e00fd26852",
      "code": "PHY7-U01-S05-11D-P03",
      "version": 1,
      "assessmentHash": "00c169aaae9aa0e573bfb82edc7dae40",
      "fingerprint": "3d5a2f314c6f22239882a9fa5f7ea6d4",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "c93f2782-f4a9-4f88-8ae3-a61495747bed",
      "code": "PHY7-U01-S05-11D-P04",
      "version": 1,
      "assessmentHash": "cb9665ae027def31d9551dd59717a70b",
      "fingerprint": "721a3d415b680c0b5dd91101b0c07d8f",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "400494da-5c31-4679-9751-47eb3751d995",
      "code": "PHY7-U01-S05-11D-P05",
      "version": 1,
      "assessmentHash": "8c5664de4e98c9807c649e28191c971e",
      "fingerprint": "eba08d19027d5a690d8b4e0b00968b9c",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "ce3660ab-4b15-4a4c-9738-3c1e2117eb3a",
      "code": "PHY7-U01-S05-11D-P06",
      "version": 1,
      "assessmentHash": "c39800a2c32f5526feca7dda5278ef1a",
      "fingerprint": "8b8cef85ae4769cd28232b676112b8f9",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "60eb770a-530f-41cf-af9c-0fd41a7589df",
      "code": "PHY7-U01-S05-11D-P07",
      "version": 1,
      "assessmentHash": "48a39b1e8d99fe500f53889cd65bedd6",
      "fingerprint": "c87e338f6d0d3a2ce4f4587c968078f3",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "37cccea0-55f3-439e-8dbf-2f99df22e6a4",
      "code": "PHY7-U01-S05-11D-P08",
      "version": 1,
      "assessmentHash": "855f607672b496fd171d52c26de01eb7",
      "fingerprint": "0d986d7db2242918451f33462e55d970",
      "templateId": "1cc2cc9f-ebc7-4190-aa95-9026921049bf",
      "sourceInputs": {
        "skillId": "378d070d-708d-4c44-bc51-249c2fa5f4d3",
        "skillCode": "PHY7-U01-S05",
        "templateCode": "PHY7-U01-S05-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "186b367e-b0d5-407d-a39e-cbcc8d04ef67",
      "code": "PHY7-U01-S06-11D-D01",
      "version": 1,
      "assessmentHash": "17588674b69d77e8b86cc0161b7680ac",
      "fingerprint": "1fedfe725b44a0c7ef72e76b2a31fbd1",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "6f42134e-decc-4f91-a5b1-19e96979b17f",
      "code": "PHY7-U01-S06-11D-D02",
      "version": 1,
      "assessmentHash": "be63d16b59855ca4bcc557b1859002dd",
      "fingerprint": "d20025d574b50dfa13e6373379b0ffcd",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "2894d03f-9401-4936-beba-dec9ae589d1b",
      "code": "PHY7-U01-S06-11D-D03",
      "version": 1,
      "assessmentHash": "f1e66c9a15d81aacf4839252a31847c9",
      "fingerprint": "200308a49d245a9da29eb5cb39c4a364",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "09e9ed74-4ce5-4c15-82d1-fbbb053f9a95",
      "code": "PHY7-U01-S06-11D-D04",
      "version": 1,
      "assessmentHash": "bd66b4ff5aaad4bf32a8ac562a381f9d",
      "fingerprint": "df3f962047ecaa7d5af1e7b3fffbdc47",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "9ba77d83-35c4-4660-b544-c46929f371a5",
      "code": "PHY7-U01-S06-11D-M01",
      "version": 1,
      "assessmentHash": "3a645ede288c9470a8c461efbbde8a96",
      "fingerprint": "8e5cc29b72392cce72fab4bbbd8141c9",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "7d61f2cc-8f94-452d-ba80-75e6153ac5aa",
      "code": "PHY7-U01-S06-11D-M02",
      "version": 1,
      "assessmentHash": "40e1dcb096bdf76af332b364d7d7701f",
      "fingerprint": "ceaa4c41dda21871059d4659225ad0e3",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "8a518008-433b-4c88-86f1-b82f92f58e06",
      "code": "PHY7-U01-S06-11D-M03",
      "version": 1,
      "assessmentHash": "600e930a6ed0605d70911dcf33d147f0",
      "fingerprint": "bcdf4a88d9a746569bf805b57a1587e5",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "45137138-be8c-47ad-bf08-1c712b34e190",
      "code": "PHY7-U01-S06-11D-M04",
      "version": 1,
      "assessmentHash": "62f15c62a879170f39e95e6fd0a7c33d",
      "fingerprint": "111beec2ab6bee8fc1356f770a2b01c5",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "35145cd7-8ce1-4f52-8562-1d636c656136",
      "code": "PHY7-U01-S06-11D-M05",
      "version": 1,
      "assessmentHash": "b0c3e28bafa325480b63666d690fbaa3",
      "fingerprint": "06a779dce9d8319e36f2fe4bb9c2bfdd",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "49e02694-9716-4b70-a2d8-d89c70987c8d",
      "code": "PHY7-U01-S06-11D-M06",
      "version": 1,
      "assessmentHash": "79eb6866485c2763f6e64dd49b1bc1f7",
      "fingerprint": "030a15edc2a8dbc89cb92406db5c12ab",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "dbc50a6e-72db-461f-bb20-43d8a9c9e3eb",
      "code": "PHY7-U01-S06-11D-P01",
      "version": 1,
      "assessmentHash": "e09bc15da546f8fdb0e1a22a1769e7b5",
      "fingerprint": "165be5264b16ed7b0599f76730bda849",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "a99d16e6-76d1-4056-b403-062ace32db3f",
      "code": "PHY7-U01-S06-11D-P02",
      "version": 1,
      "assessmentHash": "c21c78290351790f3f6e628f90af1c14",
      "fingerprint": "f282787ad5166ba6ff29f4552f4fa7a4",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "f2439ae4-fb10-41eb-8d09-f23fc40f04c7",
      "code": "PHY7-U01-S06-11D-P03",
      "version": 1,
      "assessmentHash": "27a568093d20a0730151d613e3910278",
      "fingerprint": "e4b7cad822782f01026af7259390d807",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "03b81f1d-dc22-4927-bac5-c1b003a7db7c",
      "code": "PHY7-U01-S06-11D-P04",
      "version": 1,
      "assessmentHash": "f7c661381ceb436f836de5cb24015be0",
      "fingerprint": "8a3b8e4ce580521024b9a18a9fe98460",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "5d8b38ef-10b2-4b78-8c8a-9187fee30f4b",
      "code": "PHY7-U01-S06-11D-P05",
      "version": 1,
      "assessmentHash": "644d0eed6d17c5f9acd6391954bc975c",
      "fingerprint": "5e4dcf952cae4a0d1e75383c2219a4c6",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "1cd69dd6-c4d7-4317-a85c-f0ddbb9b5a37",
      "code": "PHY7-U01-S06-11D-P06",
      "version": 1,
      "assessmentHash": "260fd1c0b5fcaa1efe0300e16a1314ba",
      "fingerprint": "7254bc586e6cfdeded4b09ec7759bd71",
      "templateId": "b1b0786f-5fcf-434c-b505-0d366c2f6f10",
      "sourceInputs": {
        "skillId": "431b5dd4-51ce-4115-b9f0-7d41ad366e20",
        "skillCode": "PHY7-U01-S06",
        "templateCode": "PHY7-U01-S06-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "9e9af5c6-10bf-473c-af8e-530f132aac49",
      "code": "PHY7-U01-S07-T-LENGTH-TO-M-V-264ADC39D7",
      "version": 1,
      "assessmentHash": "7cdcf0183ea53b30b395c04241f7370f",
      "fingerprint": "faa2def4e16854a2456bbc70ca82352a",
      "templateId": "62e49d2e-42da-4f50-a7c5-2ceac0cef13a",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-LENGTH-TO-M",
        "seed": "11d-final-S07-0004"
      }
    },
    {
      "itemId": "22f8dfb7-e8f0-4054-8cea-dbe0fde0876a",
      "code": "PHY7-U01-S07-T-LENGTH-TO-M-V-27BCF648CE",
      "version": 1,
      "assessmentHash": "707a91453beb02cadb9d278480ce486a",
      "fingerprint": "47b36aa7ec31f1fa1951a9cfd2c3888d",
      "templateId": "62e49d2e-42da-4f50-a7c5-2ceac0cef13a",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-LENGTH-TO-M",
        "seed": "11d-final-S07-0025"
      }
    },
    {
      "itemId": "030cdc5f-b983-4785-9648-d9a71644961f",
      "code": "PHY7-U01-S07-T-LENGTH-TO-M-V-5D69D12D4E",
      "version": 1,
      "assessmentHash": "93a3620d8df85d43df20ce441d222068",
      "fingerprint": "8232098136cec45fd274507c91c64ddb",
      "templateId": "62e49d2e-42da-4f50-a7c5-2ceac0cef13a",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-LENGTH-TO-M",
        "seed": "11d-final-S07-0007"
      }
    },
    {
      "itemId": "9b2125a9-8db6-49f7-9aca-4d2bca3f1f61",
      "code": "PHY7-U01-S07-T-LENGTH-TO-M-V-9B02433D34",
      "version": 1,
      "assessmentHash": "4406dd494ec4df9cf99f751f3c7e2023",
      "fingerprint": "1ab2d2a6627d9c01bc5a39ed2aa9e72e",
      "templateId": "62e49d2e-42da-4f50-a7c5-2ceac0cef13a",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-LENGTH-TO-M",
        "seed": "11d-final-S07-0016"
      }
    },
    {
      "itemId": "93abd907-febe-4ee1-bbc1-3a9dd40d2c76",
      "code": "PHY7-U01-S07-T-LENGTH-TO-M-V-9B357DFD92",
      "version": 1,
      "assessmentHash": "9972a7ace781ced5c53545ae7dd087d8",
      "fingerprint": "4dd0ecfae118de1722c4ea7d93c73e0e",
      "templateId": "62e49d2e-42da-4f50-a7c5-2ceac0cef13a",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-LENGTH-TO-M",
        "seed": "11d-final-S07-0019"
      }
    },
    {
      "itemId": "9feb04e5-957b-4bd8-b1d3-897e72ded8e8",
      "code": "PHY7-U01-S07-T-LENGTH-TO-M-V-C1DD744ED2",
      "version": 1,
      "assessmentHash": "c3c3237ee31ecd3e370894b2f695e4b1",
      "fingerprint": "0d580bafbb039863c7adb8e056769904",
      "templateId": "62e49d2e-42da-4f50-a7c5-2ceac0cef13a",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-LENGTH-TO-M",
        "seed": "11d-final-S07-0001"
      }
    },
    {
      "itemId": "db518bc5-6b39-43f0-9224-24185f7566f8",
      "code": "PHY7-U01-S07-T-LENGTH-TO-M-V-E5DD167413",
      "version": 1,
      "assessmentHash": "8e2fc164596f59a6d91dbd2e9c92ed6e",
      "fingerprint": "9bf38df1cf09a62b5fa7c52873998c52",
      "templateId": "62e49d2e-42da-4f50-a7c5-2ceac0cef13a",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-LENGTH-TO-M",
        "seed": "11d-final-S07-0034"
      }
    },
    {
      "itemId": "fb787f94-5eab-42ac-a712-e81047457aba",
      "code": "PHY7-U01-S07-T-TIME-TO-S-V-1A8488AE69",
      "version": 1,
      "assessmentHash": "c23d28d463c2e324f4ba479bcdda2a7c",
      "fingerprint": "ab8d38c9ae67fe8e3795b2b9f9df8e16",
      "templateId": "e1eaf291-2425-48f2-ba2e-b639db3c3419",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-TIME-TO-S",
        "seed": "11d-final-S07-0017"
      }
    },
    {
      "itemId": "2bfda007-7b12-4a76-9c6e-2ee8fb422117",
      "code": "PHY7-U01-S07-T-TIME-TO-S-V-20E0560EFE",
      "version": 1,
      "assessmentHash": "d6b87b75dead746a8f3dc3129c86ee3f",
      "fingerprint": "8884be8e0290bdcca65cd28130119029",
      "templateId": "e1eaf291-2425-48f2-ba2e-b639db3c3419",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-TIME-TO-S",
        "seed": "11d-final-S07-0035"
      }
    },
    {
      "itemId": "24f67bd3-0520-47cc-b056-793acf6ebd8e",
      "code": "PHY7-U01-S07-T-TIME-TO-S-V-2960A22160",
      "version": 1,
      "assessmentHash": "ea465ad8a754bf80c156769a71cf636c",
      "fingerprint": "df5656d326e94de194739f3ba8df8879",
      "templateId": "e1eaf291-2425-48f2-ba2e-b639db3c3419",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-TIME-TO-S",
        "seed": "11d-final-S07-0041"
      }
    },
    {
      "itemId": "bc4427d8-7e53-40f2-be4c-0922330b1527",
      "code": "PHY7-U01-S07-T-TIME-TO-S-V-6BBDC91E8B",
      "version": 1,
      "assessmentHash": "3496f140b6145da350f28ed3f4087dcd",
      "fingerprint": "6c9e8f12606adec7f8a0cdeecf29264f",
      "templateId": "e1eaf291-2425-48f2-ba2e-b639db3c3419",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-TIME-TO-S",
        "seed": "11d-final-S07-0011"
      }
    },
    {
      "itemId": "a707b487-2d11-4b82-b2f3-ec0f451fcb3c",
      "code": "PHY7-U01-S07-T-TIME-TO-S-V-868C239B2F",
      "version": 1,
      "assessmentHash": "b12435114ca0f38220c2f00185b2ba79",
      "fingerprint": "308592bcaa5a1b78e01da5e96485bc8e",
      "templateId": "e1eaf291-2425-48f2-ba2e-b639db3c3419",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-TIME-TO-S",
        "seed": "11d-final-S07-0005"
      }
    },
    {
      "itemId": "2b362389-4e99-489f-8348-879e12c1bb53",
      "code": "PHY7-U01-S07-T-TIME-TO-S-V-8CB64283F5",
      "version": 1,
      "assessmentHash": "7ee519619eb566949af9d227a049d232",
      "fingerprint": "72616c1b07f1fe29c7161ccb5c029578",
      "templateId": "e1eaf291-2425-48f2-ba2e-b639db3c3419",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-TIME-TO-S",
        "seed": "11d-final-S07-0014"
      }
    },
    {
      "itemId": "effa28e1-9a14-4bb9-8396-2efa8b64b3ff",
      "code": "PHY7-U01-S07-T-TIME-TO-S-V-A602FD0AC3",
      "version": 1,
      "assessmentHash": "e15f7d151ed73645707e92b451ff24b3",
      "fingerprint": "ddc6729565fc632602b9de798a7df157",
      "templateId": "e1eaf291-2425-48f2-ba2e-b639db3c3419",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-TIME-TO-S",
        "seed": "11d-final-S07-0020"
      }
    },
    {
      "itemId": "1f684591-ec2b-4e1b-8aff-8de575b221f0",
      "code": "PHY7-U01-S07-T-VOLUME-TO-L-V-69031BD609",
      "version": 1,
      "assessmentHash": "ac908a6f7b9713847b2dbd7d92b3cdb3",
      "fingerprint": "181e3cea2e27ccb73531fe54e3eef55d",
      "templateId": "30481198-36f4-466c-91cc-51b1d7078007",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-VOLUME-TO-L",
        "seed": "11d-final-S07-0018"
      }
    },
    {
      "itemId": "adde6224-85c9-48e9-85b6-6d35a8cfc227",
      "code": "PHY7-U01-S07-T-VOLUME-TO-L-V-811EFE7359",
      "version": 1,
      "assessmentHash": "62b089190a5902be7cfa0259006b5265",
      "fingerprint": "a5627824b13bcd5f1e3b5343421c19bf",
      "templateId": "30481198-36f4-466c-91cc-51b1d7078007",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-VOLUME-TO-L",
        "seed": "11d-final-S07-0009"
      }
    },
    {
      "itemId": "3dfa5d9e-f214-40fe-9d4e-1c54864e50a9",
      "code": "PHY7-U01-S07-T-VOLUME-TO-L-V-F82DFB4962",
      "version": 1,
      "assessmentHash": "9c52f687cf0687b5575512b7588bd451",
      "fingerprint": "526a1fec6c982729772134570d51b522",
      "templateId": "30481198-36f4-466c-91cc-51b1d7078007",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-VOLUME-TO-L",
        "seed": "11d-final-S07-0039"
      }
    },
    {
      "itemId": "9d08af33-ec06-4562-bebd-d5b7ca224462",
      "code": "PHY7-U01-S07-T-VOLUME-TO-L-V-FEA1E804F2",
      "version": 1,
      "assessmentHash": "8c13558cf689d1cb4f1bbf4e52c854f4",
      "fingerprint": "44efe0dda7d41fdc0e61166b3d7c6a35",
      "templateId": "30481198-36f4-466c-91cc-51b1d7078007",
      "sourceInputs": {
        "skillId": "632ba449-4d11-4c74-8b88-cc94c79a944f",
        "skillCode": "PHY7-U01-S07",
        "templateCode": "PHY7-U01-S07-T-VOLUME-TO-L",
        "seed": "11d-final-S07-0012"
      }
    },
    {
      "itemId": "fedb2149-7d7d-4995-b18d-36c254055291",
      "code": "PHY7-U01-S08-T-SCALE-DIVISION-V-02B329F4DD",
      "version": 1,
      "assessmentHash": "cb124cfa792159648c468acb826e233a",
      "fingerprint": "00cf162940c79baf7d5f5de2bfee143e",
      "templateId": "d37cb7ef-c4e0-4e0f-ae8b-a36b587a7e3d",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-DIVISION",
        "seed": "11d-final-S08-0015"
      }
    },
    {
      "itemId": "7b0fbecc-f22d-4062-b681-baccbd0871a8",
      "code": "PHY7-U01-S08-T-SCALE-DIVISION-V-0A68BB37B2",
      "version": 1,
      "assessmentHash": "a93d4f821083df79af774fb8d9b4ea2c",
      "fingerprint": "9fc545814299cca03842f36de80aa947",
      "templateId": "d37cb7ef-c4e0-4e0f-ae8b-a36b587a7e3d",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-DIVISION",
        "seed": "11d-final-S08-0013"
      }
    },
    {
      "itemId": "db7a416d-4adc-4e44-8c87-cc597f74940f",
      "code": "PHY7-U01-S08-T-SCALE-DIVISION-V-0EF9E977A3",
      "version": 1,
      "assessmentHash": "1deaf117ea2d879429d619e01b59a222",
      "fingerprint": "a90d6e565a21345f4b644bbd28289697",
      "templateId": "d37cb7ef-c4e0-4e0f-ae8b-a36b587a7e3d",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-DIVISION",
        "seed": "11d-final-S08-0007"
      }
    },
    {
      "itemId": "2217d9b3-4186-4b3a-8ac8-f5a4720e7f2d",
      "code": "PHY7-U01-S08-T-SCALE-DIVISION-V-259223D056",
      "version": 1,
      "assessmentHash": "b5351de645c8bf0d8155d4893d330db8",
      "fingerprint": "702ce8ecf338e102b17a4409f3a79021",
      "templateId": "d37cb7ef-c4e0-4e0f-ae8b-a36b587a7e3d",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-DIVISION",
        "seed": "11d-final-S08-0009"
      }
    },
    {
      "itemId": "543b3672-2175-4c8f-8a39-e3e543c2e5b0",
      "code": "PHY7-U01-S08-T-SCALE-DIVISION-V-598395582D",
      "version": 1,
      "assessmentHash": "fda2088a8557ab45afb240de2d10bd52",
      "fingerprint": "e072543fb8f308422b85bbad8fe68d30",
      "templateId": "d37cb7ef-c4e0-4e0f-ae8b-a36b587a7e3d",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-DIVISION",
        "seed": "11d-final-S08-0011"
      }
    },
    {
      "itemId": "d9fc5f42-6ff0-4ff1-8392-447590393eb7",
      "code": "PHY7-U01-S08-T-SCALE-DIVISION-V-5AD5E0D744",
      "version": 1,
      "assessmentHash": "222469fd4bca816bc107ceeaba76a516",
      "fingerprint": "35d908bb05fd239af0acd8e9ce67df72",
      "templateId": "d37cb7ef-c4e0-4e0f-ae8b-a36b587a7e3d",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-DIVISION",
        "seed": "11d-final-S08-0017"
      }
    },
    {
      "itemId": "1f1029f2-ebd9-4f26-8306-8919d99de395",
      "code": "PHY7-U01-S08-T-SCALE-DIVISION-V-727419D602",
      "version": 1,
      "assessmentHash": "14037a5fd84293a70e4fac7a01e56f7f",
      "fingerprint": "55d96bcab23558ed65f7eb4dabb220c6",
      "templateId": "d37cb7ef-c4e0-4e0f-ae8b-a36b587a7e3d",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-DIVISION",
        "seed": "11d-final-S08-0001"
      }
    },
    {
      "itemId": "4bcff82b-253d-439e-bc64-332aa2275010",
      "code": "PHY7-U01-S08-T-SCALE-DIVISION-V-9DFA58C567",
      "version": 1,
      "assessmentHash": "f38b3c9cdfe5cd2a82718acb18d07568",
      "fingerprint": "5d60e634d822522d4875c65cf5b6cf71",
      "templateId": "d37cb7ef-c4e0-4e0f-ae8b-a36b587a7e3d",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-DIVISION",
        "seed": "11d-final-S08-0005"
      }
    },
    {
      "itemId": "2d943470-33b7-4702-990a-61cc90313da2",
      "code": "PHY7-U01-S08-T-SCALE-DIVISION-V-DD091BB01C",
      "version": 1,
      "assessmentHash": "387db355d42694b5ccc86174fcb4c41c",
      "fingerprint": "46963cdf0d0ce698c6c1b24d121ea3da",
      "templateId": "d37cb7ef-c4e0-4e0f-ae8b-a36b587a7e3d",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-DIVISION",
        "seed": "11d-final-S08-0003"
      }
    },
    {
      "itemId": "3f09b1a7-2868-40d3-b86c-37325c1375c0",
      "code": "PHY7-U01-S08-T-SCALE-READING-V-6DF767FCB0",
      "version": 1,
      "assessmentHash": "3986722fe4522277e601899858096ffd",
      "fingerprint": "fbd4c36338dd8faf90bde2cd17af0f19",
      "templateId": "7c7217f3-e1cb-4e9b-8f77-01c7f6da00dd",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-READING",
        "seed": "11d-final-S08-0018"
      }
    },
    {
      "itemId": "0bdbe46c-f504-48b1-b971-3a5e15e72720",
      "code": "PHY7-U01-S08-T-SCALE-READING-V-7B09EAF919",
      "version": 1,
      "assessmentHash": "22817bfc455bb19c610dff936aa22111",
      "fingerprint": "6e542766c801ef3e6fb0c7d9bd593f70",
      "templateId": "7c7217f3-e1cb-4e9b-8f77-01c7f6da00dd",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-READING",
        "seed": "11d-final-S08-0010"
      }
    },
    {
      "itemId": "c8bba53d-f129-4d9d-ba13-4c500e707db6",
      "code": "PHY7-U01-S08-T-SCALE-READING-V-8693397C89",
      "version": 1,
      "assessmentHash": "1c3a880606d6350b0495daeb7a73aa5c",
      "fingerprint": "0ad1b8551df6a110f64bd7a1736ea228",
      "templateId": "7c7217f3-e1cb-4e9b-8f77-01c7f6da00dd",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-READING",
        "seed": "11d-final-S08-0002"
      }
    },
    {
      "itemId": "7c1050bc-dcf4-47bd-be7b-7fefa143a54c",
      "code": "PHY7-U01-S08-T-SCALE-READING-V-9CB1424AA2",
      "version": 1,
      "assessmentHash": "bc0df9c3ff5d7f5a0fec133b0d9a316e",
      "fingerprint": "263372fe2f915e02c42e2bae49e1a1e4",
      "templateId": "7c7217f3-e1cb-4e9b-8f77-01c7f6da00dd",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-READING",
        "seed": "11d-final-S08-0016"
      }
    },
    {
      "itemId": "e6dc7d19-a54b-4951-9825-84d2e21e957f",
      "code": "PHY7-U01-S08-T-SCALE-READING-V-A24C6C24B5",
      "version": 1,
      "assessmentHash": "5a11a8278cb4e0997256faad7da5521c",
      "fingerprint": "29b8200fae4c2c5d36993c0ef007c089",
      "templateId": "7c7217f3-e1cb-4e9b-8f77-01c7f6da00dd",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-READING",
        "seed": "11d-final-S08-0012"
      }
    },
    {
      "itemId": "12e88e3a-0cdc-4753-8519-9b48a212326a",
      "code": "PHY7-U01-S08-T-SCALE-READING-V-A7074AEAEE",
      "version": 1,
      "assessmentHash": "a4a171da6509484f45fe9e16afa19291",
      "fingerprint": "f9ba9a295cea63878c17eb8c00a17056",
      "templateId": "7c7217f3-e1cb-4e9b-8f77-01c7f6da00dd",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-READING",
        "seed": "11d-final-S08-0006"
      }
    },
    {
      "itemId": "0bda493e-0620-4abf-8939-8bb76cce9536",
      "code": "PHY7-U01-S08-T-SCALE-READING-V-DBA8814695",
      "version": 1,
      "assessmentHash": "15e65d542bf5a6086daff7826a7a01f2",
      "fingerprint": "c954b1fb56a54ed2f752dc1e6eaca0ad",
      "templateId": "7c7217f3-e1cb-4e9b-8f77-01c7f6da00dd",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-READING",
        "seed": "11d-final-S08-0008"
      }
    },
    {
      "itemId": "f98ae114-61df-49dd-ae1f-27fe202c5485",
      "code": "PHY7-U01-S08-T-SCALE-READING-V-E593B92D8A",
      "version": 1,
      "assessmentHash": "882d4584a6395672a1fa90a00ec4131a",
      "fingerprint": "cc8dad6fdb867fc379119b9c9c8055f7",
      "templateId": "7c7217f3-e1cb-4e9b-8f77-01c7f6da00dd",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-READING",
        "seed": "11d-final-S08-0014"
      }
    },
    {
      "itemId": "b3db3448-c9ae-45ca-9bda-9705650a85e2",
      "code": "PHY7-U01-S08-T-SCALE-READING-V-F54F70A68B",
      "version": 1,
      "assessmentHash": "0740a6c1624fe712e33cdd13246c8215",
      "fingerprint": "895be5cadd17c9aed6754a5f7c040d63",
      "templateId": "7c7217f3-e1cb-4e9b-8f77-01c7f6da00dd",
      "sourceInputs": {
        "skillId": "26ac01f1-e222-4123-ba11-be3ddd150964",
        "skillCode": "PHY7-U01-S08",
        "templateCode": "PHY7-U01-S08-T-SCALE-READING",
        "seed": "11d-final-S08-0004"
      }
    },
    {
      "itemId": "e71a9790-c10d-4cc2-84b7-e9a6d2f84372",
      "code": "PHY7-U01-S09-11D-D04",
      "version": 1,
      "assessmentHash": "2c1ebe5babb6e5bb07b6d0a3a76040e9",
      "fingerprint": "922b6290d6fbf399243684bf68c1b9e9",
      "templateId": "1e0713b7-0743-4335-8afe-4ec7a2301f5b",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "428c8b98-ea81-4e2e-9f39-3e01475ef09e",
      "code": "PHY7-U01-S09-11D-M01",
      "version": 1,
      "assessmentHash": "bd982af433cf07d59cb6a7933133b0d9",
      "fingerprint": "0556b68a27c10193f50e780d223652da",
      "templateId": "1e0713b7-0743-4335-8afe-4ec7a2301f5b",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "cda3915f-a63f-462e-9f43-551ba4a1fcb7",
      "code": "PHY7-U01-S09-11D-M02",
      "version": 1,
      "assessmentHash": "7789f4c96d24184ce96ef4917a1a3c66",
      "fingerprint": "ef0c7d0f218e778c4c7cf574793c77cc",
      "templateId": "1e0713b7-0743-4335-8afe-4ec7a2301f5b",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "863e2e28-6a3d-4fd1-9248-0db0d17df95a",
      "code": "PHY7-U01-S09-11D-M03",
      "version": 1,
      "assessmentHash": "6bb5fae9eb0bee0a318cdf27ffa247db",
      "fingerprint": "bff6c5ca22df0d2b6247107ebe71cf36",
      "templateId": "1e0713b7-0743-4335-8afe-4ec7a2301f5b",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "c740895d-b3af-4f2d-a567-1b14b92326a6",
      "code": "PHY7-U01-S09-11D-M04",
      "version": 1,
      "assessmentHash": "dd871dcdf2be8f2a731b968658d24f11",
      "fingerprint": "5f32ee50d4bb6c1067fc42e1e251df71",
      "templateId": "1e0713b7-0743-4335-8afe-4ec7a2301f5b",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "01c7fecd-332c-402f-ad2e-4f286cb7f2af",
      "code": "PHY7-U01-S09-11D-M05",
      "version": 1,
      "assessmentHash": "5723d248341c98fd2b90400bffd8173c",
      "fingerprint": "e8ae2c636af8c2b883f7066889ecc0ea",
      "templateId": "1e0713b7-0743-4335-8afe-4ec7a2301f5b",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "f3d7e751-058e-488e-99ca-cebb0ddc7c38",
      "code": "PHY7-U01-S09-11D-M06",
      "version": 1,
      "assessmentHash": "e32fa14b4726928a4606f5987343f891",
      "fingerprint": "236ae2f08ef3e7785aa00733de9dbf2f",
      "templateId": "1e0713b7-0743-4335-8afe-4ec7a2301f5b",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "f95b79de-861d-42fe-8528-f4fd5aac89dd",
      "code": "PHY7-U01-S09-11D-P08",
      "version": 1,
      "assessmentHash": "c7cac10e3b1beb92e3fefac18ef3d4b8",
      "fingerprint": "48aa9102a9dfb93fe7399285348416f3",
      "templateId": "1e0713b7-0743-4335-8afe-4ec7a2301f5b",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-11D-PARALLEL",
        "seed": null
      }
    },
    {
      "itemId": "c4a56f85-8cb2-4c21-bf3f-1a6abca69ddc",
      "code": "PHY7-U01-S09-T-MEASUREMENT-ERROR-V-035ABC3FF7",
      "version": 1,
      "assessmentHash": "a446d028fa69489870b3bc78853eeb47",
      "fingerprint": "ab319fb6512181a6344ab46dd0c9d7da",
      "templateId": "b655373f-b2b4-4ece-8113-15a85370f23d",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-MEASUREMENT-ERROR",
        "seed": "11d-final-S09-0029"
      }
    },
    {
      "itemId": "17471540-214b-4496-a9ad-127846c4fbe4",
      "code": "PHY7-U01-S09-T-MEASUREMENT-ERROR-V-26520D7F52",
      "version": 1,
      "assessmentHash": "f9c0cd7d03e7015a78fc4dbdc378df9e",
      "fingerprint": "c6ff8718474198874435358f0f10bb44",
      "templateId": "b655373f-b2b4-4ece-8113-15a85370f23d",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-MEASUREMENT-ERROR",
        "seed": "11d-final-S09-0035"
      }
    },
    {
      "itemId": "1b049afc-dec7-4e35-acd1-d8e8703b24ad",
      "code": "PHY7-U01-S09-T-MEASUREMENT-ERROR-V-569CAA5F99",
      "version": 1,
      "assessmentHash": "330cde1f7a92886529eeeab4522516cf",
      "fingerprint": "30a3e45f408a110320fe3c5bd360c19d",
      "templateId": "b655373f-b2b4-4ece-8113-15a85370f23d",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-MEASUREMENT-ERROR",
        "seed": "11d-final-S09-0011"
      }
    },
    {
      "itemId": "9538795f-fc19-4c8e-b3af-f93de67c2c3e",
      "code": "PHY7-U01-S09-T-MEASUREMENT-ERROR-V-59D524D587",
      "version": 1,
      "assessmentHash": "30b2663b2bf6e575ed03620a28298046",
      "fingerprint": "e78f5a8ba77bc0b177e9ece37df894b4",
      "templateId": "b655373f-b2b4-4ece-8113-15a85370f23d",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-MEASUREMENT-ERROR",
        "seed": "11d-final-S09-0004"
      }
    },
    {
      "itemId": "531a1e77-d024-41c4-b792-86266265fbc8",
      "code": "PHY7-U01-S09-T-MEASUREMENT-ERROR-V-5D0D898EBE",
      "version": 1,
      "assessmentHash": "7abf72fbf53d1cee2332fd06dc2eaa9b",
      "fingerprint": "a442970b69b0660b2f5e99741b258fb0",
      "templateId": "b655373f-b2b4-4ece-8113-15a85370f23d",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-MEASUREMENT-ERROR",
        "seed": "11d-final-S09-0033"
      }
    },
    {
      "itemId": "8cdec002-56cb-4770-808e-d06c184b488a",
      "code": "PHY7-U01-S09-T-MEASUREMENT-ERROR-V-8C3A1DFE29",
      "version": 1,
      "assessmentHash": "477f49c0a1aea55249a9c563f749fe40",
      "fingerprint": "c211ae28f16cfac9f720b0402913ddcd",
      "templateId": "b655373f-b2b4-4ece-8113-15a85370f23d",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-MEASUREMENT-ERROR",
        "seed": "11d-final-S09-0006"
      }
    },
    {
      "itemId": "75fe9fb2-b3d8-4eb5-a338-45b491f5b6f6",
      "code": "PHY7-U01-S09-T-MEASUREMENT-ERROR-V-972DAEDC18",
      "version": 1,
      "assessmentHash": "1d410475b53df7531a5dd51cf4c3d735",
      "fingerprint": "98ed1b94bdc86ee5007e83ea628779c6",
      "templateId": "b655373f-b2b4-4ece-8113-15a85370f23d",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-MEASUREMENT-ERROR",
        "seed": "11d-final-S09-0023"
      }
    },
    {
      "itemId": "72278037-8309-4c95-8f24-229be6614760",
      "code": "PHY7-U01-S09-T-MEASUREMENT-ERROR-V-C584A1122C",
      "version": 1,
      "assessmentHash": "1a682af2d3fab22288e28ef334023e2d",
      "fingerprint": "8956c0cd1fb0cc2f3d92524781a539f7",
      "templateId": "b655373f-b2b4-4ece-8113-15a85370f23d",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-MEASUREMENT-ERROR",
        "seed": "11d-final-S09-0002"
      }
    },
    {
      "itemId": "89038d01-4493-4de5-966c-6fe46317a736",
      "code": "PHY7-U01-S09-T-MEASUREMENT-ERROR-V-DFE07550F8",
      "version": 1,
      "assessmentHash": "b5165692342a70d97a4a70d998dbd04d",
      "fingerprint": "2eaec013516ce66d66d4bc63dd5ad5e9",
      "templateId": "b655373f-b2b4-4ece-8113-15a85370f23d",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-MEASUREMENT-ERROR",
        "seed": "11d-final-S09-0001"
      }
    },
    {
      "itemId": "1e9c8a31-08a4-4b8e-9586-03ed6c99ce7b",
      "code": "PHY7-U01-S09-T-MEASUREMENT-ERROR-V-E784CEA785",
      "version": 1,
      "assessmentHash": "42256b665643b936a8c1ca11705e32a0",
      "fingerprint": "38bf96fc5b5b94fd052631cad4182940",
      "templateId": "b655373f-b2b4-4ece-8113-15a85370f23d",
      "sourceInputs": {
        "skillId": "5609ea1b-dafe-449a-8783-4786bedd298a",
        "skillCode": "PHY7-U01-S09",
        "templateCode": "PHY7-U01-S09-T-MEASUREMENT-ERROR",
        "seed": "11d-final-S09-0007"
      }
    },
    {
      "itemId": "11b72fd3-8e49-481d-8172-b8f3ed0afd83",
      "code": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME-V-186BBEFE56",
      "version": 1,
      "assessmentHash": "24ff9366d3ea03abdc2229f9bae80793",
      "fingerprint": "abb1dc9cc01c59c0cf2c957f83e330d0",
      "templateId": "d29016bb-c614-4bbe-8bb3-1e3b705b40b9",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME",
        "seed": "11d-final-S10-0007"
      }
    },
    {
      "itemId": "018a873b-c7c4-49db-9b04-38b9244a554b",
      "code": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME-V-1E9DB45A91",
      "version": 1,
      "assessmentHash": "6c7522b6f967b43f99967f5d1577b950",
      "fingerprint": "9569c86e1c4a0bf6e1215e997b37fdee",
      "templateId": "d29016bb-c614-4bbe-8bb3-1e3b705b40b9",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME",
        "seed": "11d-final-S10-0019"
      }
    },
    {
      "itemId": "75382517-a29a-497e-ab14-dcead60b34ef",
      "code": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME-V-2BB07EDF8D",
      "version": 1,
      "assessmentHash": "5512395b939b66c412162c335892d9d2",
      "fingerprint": "941c4ab6ea80a1bd73ac7a3a63f5a04a",
      "templateId": "d29016bb-c614-4bbe-8bb3-1e3b705b40b9",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME",
        "seed": "11d-final-S10-0003"
      }
    },
    {
      "itemId": "15b9efd4-c497-48de-8b84-d1315cf72adb",
      "code": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME-V-67BB39F386",
      "version": 1,
      "assessmentHash": "5546722adbfc773987216bf25b39cae5",
      "fingerprint": "e7753f769ee2649d6e11c13211ef4ffa",
      "templateId": "d29016bb-c614-4bbe-8bb3-1e3b705b40b9",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME",
        "seed": "11d-final-S10-0009"
      }
    },
    {
      "itemId": "231d8a84-18bf-4fb6-9902-0c3c90bff6fe",
      "code": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME-V-71FBEDF105",
      "version": 1,
      "assessmentHash": "41ee093c36626fb9b158cab8ef0955da",
      "fingerprint": "7492fcc3c67cb3837e080bbb695d09b0",
      "templateId": "d29016bb-c614-4bbe-8bb3-1e3b705b40b9",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME",
        "seed": "11d-final-S10-0015"
      }
    },
    {
      "itemId": "b169d248-a109-4850-8bec-6bd7d0de2f2b",
      "code": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME-V-82E7FCA37C",
      "version": 1,
      "assessmentHash": "39c1e88b7a446a1c56d0abadb9cdd588",
      "fingerprint": "9e691589b6f6c70bd47eefb2fed9ff2d",
      "templateId": "d29016bb-c614-4bbe-8bb3-1e3b705b40b9",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME",
        "seed": "11d-final-S10-0013"
      }
    },
    {
      "itemId": "e8b591fd-bd87-44d6-8f1a-c1ca535ab6b9",
      "code": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME-V-9F2F1CFD8F",
      "version": 1,
      "assessmentHash": "7cee5458c04360af44ed343807e9d64a",
      "fingerprint": "3fa644529a4f48ea04df07444895e2cb",
      "templateId": "d29016bb-c614-4bbe-8bb3-1e3b705b40b9",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME",
        "seed": "11d-final-S10-0017"
      }
    },
    {
      "itemId": "6165aa37-8bc6-4fb2-9f94-83cfc4572bb1",
      "code": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME-V-9F9A6FD774",
      "version": 1,
      "assessmentHash": "9c392653b6647b08fc3be53821c670f6",
      "fingerprint": "148d05b34ff09a843b204166fedfe6f0",
      "templateId": "d29016bb-c614-4bbe-8bb3-1e3b705b40b9",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME",
        "seed": "11d-final-S10-0001"
      }
    },
    {
      "itemId": "13a06469-ac26-49a1-89da-c382dfcbff38",
      "code": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME-V-D356352F0A",
      "version": 1,
      "assessmentHash": "d8f5fb1b710bf0f1951a408cfdb2142e",
      "fingerprint": "257abfdbb95b3ae52e41bcf3a5c25862",
      "templateId": "d29016bb-c614-4bbe-8bb3-1e3b705b40b9",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-DISPLACEMENT-VOLUME",
        "seed": "11d-final-S10-0005"
      }
    },
    {
      "itemId": "8f9030b0-8c30-4ef7-9631-87f4515d3ecb",
      "code": "PHY7-U01-S10-T-SHEET-THICKNESS-V-3BB99160DD",
      "version": 1,
      "assessmentHash": "3f2f003dea258446df310141d3066d42",
      "fingerprint": "c6d5e38fbed3381c45c0d0799ef65a1b",
      "templateId": "e8951a6e-290e-4acf-8de8-9b6c9559bfc0",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-SHEET-THICKNESS",
        "seed": "11d-final-S10-0022"
      }
    },
    {
      "itemId": "9088e001-56b2-4a4a-9f58-3b16b2a74bf2",
      "code": "PHY7-U01-S10-T-SHEET-THICKNESS-V-590BE53E83",
      "version": 1,
      "assessmentHash": "486404a73fe4b1cbf2493103fac443ef",
      "fingerprint": "773f510415498248b63604382378e2bd",
      "templateId": "e8951a6e-290e-4acf-8de8-9b6c9559bfc0",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-SHEET-THICKNESS",
        "seed": "11d-final-S10-0002"
      }
    },
    {
      "itemId": "7909f5b6-5b29-4ce3-a403-5e0afb3d9766",
      "code": "PHY7-U01-S10-T-SHEET-THICKNESS-V-8DAD957553",
      "version": 1,
      "assessmentHash": "62f15128965b52ac9aaa67f9b24f9fb0",
      "fingerprint": "61ecd3fcb24e641f2a74550e54f96587",
      "templateId": "e8951a6e-290e-4acf-8de8-9b6c9559bfc0",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-SHEET-THICKNESS",
        "seed": "11d-final-S10-0020"
      }
    },
    {
      "itemId": "70ec9b14-7d86-48f5-a96f-7c82ccba9cd5",
      "code": "PHY7-U01-S10-T-SHEET-THICKNESS-V-8EDFECC502",
      "version": 1,
      "assessmentHash": "40015f4ec9779968d1692e8922ced750",
      "fingerprint": "a2bb40c879b0888a29c4c57401455a91",
      "templateId": "e8951a6e-290e-4acf-8de8-9b6c9559bfc0",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-SHEET-THICKNESS",
        "seed": "11d-final-S10-0008"
      }
    },
    {
      "itemId": "e0522c6b-e364-4f69-a663-06dc73045429",
      "code": "PHY7-U01-S10-T-SHEET-THICKNESS-V-9BD7C6CD7E",
      "version": 1,
      "assessmentHash": "e44ee96809c4b03449f29d794b817346",
      "fingerprint": "4aa9489b2a861a27287a677abdd886b7",
      "templateId": "e8951a6e-290e-4acf-8de8-9b6c9559bfc0",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-SHEET-THICKNESS",
        "seed": "11d-final-S10-0016"
      }
    },
    {
      "itemId": "ccde2841-590b-4df9-9e06-46c7f8ceed05",
      "code": "PHY7-U01-S10-T-SHEET-THICKNESS-V-A3759DBBC3",
      "version": 1,
      "assessmentHash": "21ba8ce122895a39ea0163fd8a98964b",
      "fingerprint": "03aa145e35ab947cb1d04f0d8ff96170",
      "templateId": "e8951a6e-290e-4acf-8de8-9b6c9559bfc0",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-SHEET-THICKNESS",
        "seed": "11d-final-S10-0006"
      }
    },
    {
      "itemId": "68451e98-7ee8-4272-8ede-9627bdb7a8f4",
      "code": "PHY7-U01-S10-T-SHEET-THICKNESS-V-B1F08FE218",
      "version": 1,
      "assessmentHash": "bc8b4f5ad428831d404abbcef856dbd6",
      "fingerprint": "c3544474a2766a361981be7e57bcd3e9",
      "templateId": "e8951a6e-290e-4acf-8de8-9b6c9559bfc0",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-SHEET-THICKNESS",
        "seed": "11d-final-S10-0004"
      }
    },
    {
      "itemId": "36c6d061-4729-417b-8ef1-a5118c69925b",
      "code": "PHY7-U01-S10-T-SHEET-THICKNESS-V-BCEC23FE4B",
      "version": 1,
      "assessmentHash": "9ce495f875f23f1f262d476e3b985351",
      "fingerprint": "7a158e9d34305113ed7da350a31a1567",
      "templateId": "e8951a6e-290e-4acf-8de8-9b6c9559bfc0",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-SHEET-THICKNESS",
        "seed": "11d-final-S10-0012"
      }
    },
    {
      "itemId": "1bcce739-5c17-41e7-b24f-cdd088610d9b",
      "code": "PHY7-U01-S10-T-SHEET-THICKNESS-V-D4DA85DC63",
      "version": 1,
      "assessmentHash": "367cdcd62cd829fd85bed4868463b37f",
      "fingerprint": "1670da7511732975cf6687b5d720660b",
      "templateId": "e8951a6e-290e-4acf-8de8-9b6c9559bfc0",
      "sourceInputs": {
        "skillId": "a5c84a0a-7ff9-42cc-b656-55490135bc0e",
        "skillCode": "PHY7-U01-S10",
        "templateCode": "PHY7-U01-S10-T-SHEET-THICKNESS",
        "seed": "11d-final-S10-0010"
      }
    }
  ],
  "blocked": []
}
$manifest$::jsonb;e jsonb;s jsonb;v jsonb;scope_id uuid;
begin
 lock table public.items,public.item_options,public.item_answer_keys,public.item_versions,public.assessment_blueprint_items,public.assessment_blueprints,public.curriculum_releases in share row exclusive mode;
 select id into scope_id from public.curriculum_releases where release_key=manifest->>'scope' and status in('pilot','production');
 if scope_id is null then raise exception 'snapshot_recovery_scope_unavailable';end if;
 for e in select value from jsonb_array_elements(manifest->'entries') loop
  select snapshot into v from public.item_versions where item_id=(e->>'itemId')::uuid and version_no=(e->>'version')::integer;
  if v is not null then
   if md5(private.item_snapshot_assessment_content(v)::text) is distinct from e->>'assessmentHash' then raise exception 'snapshot_recovery_existing_conflict:%',e->>'code';end if;
   continue;
  end if;
  s:=private.current_item_version_snapshot((e->>'itemId')::uuid);
  if s#>>'{item,code}' is distinct from e->>'code' or s#>>'{item,version_no}' is distinct from e->>'version'
    or s#>>'{item,item_template_id}' is distinct from e->>'templateId'
    or s#>>'{item,variant_fingerprint}' is distinct from e->>'fingerprint'
    or md5(private.item_snapshot_assessment_content(s)::text) is distinct from e->>'assessmentHash'
    or not exists(select 1 from public.assessment_blueprint_items bi join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id
       where bp.curriculum_release_id=scope_id and bi.item_id=(e->>'itemId')::uuid and bi.item_version_snapshot=(e->>'version')::integer
        and bi.variant_fingerprint_snapshot=e->>'fingerprint')
    or exists(select 1 from public.assessment_blueprint_items bi join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id
       where bp.curriculum_release_id=scope_id and bi.item_id=(e->>'itemId')::uuid and bi.item_version_snapshot=(e->>'version')::integer
        and (bi.variant_fingerprint_snapshot is distinct from e->>'fingerprint'
          or bi.item_template_id is distinct from (e->>'templateId')::uuid or bi.template_version_snapshot is distinct from 1))
  then raise exception 'snapshot_recovery_content_or_reference_drift:%',e->>'code';end if;
  insert into public.item_versions(item_id,version_no,snapshot,change_summary)
  values((e->>'itemId')::uuid,(e->>'version')::integer,s||jsonb_build_object('recovery',jsonb_build_object(
    'protocol',manifest->>'schemaVersion','assessmentHash',e->>'assessmentHash','sources',manifest->'sources',
    'historicalFields','verified assessment content only','operationalMetadata','current at recovery; not historical approval proof')),
   'Restore missing snapshot: assessable content replayed from pinned pre-release sources; no historical review or learning record changed');
 end loop;
 if exists(select 1 from public.assessment_blueprint_items bi join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id left join public.item_versions v on v.item_id=bi.item_id and v.version_no=bi.item_version_snapshot where bp.curriculum_release_id=scope_id and bp.status in('pilot','production') and v.item_id is null)
 then raise exception 'snapshot_recovery_unlisted_gap';end if;
end;$recovery$;

create or replace function private.assert_item_version_snapshot(p_item uuid,p_version integer)
returns void language plpgsql stable security invoker set search_path='' as $$
declare s jsonb;
begin
 select snapshot into s from public.item_versions where item_id=p_item and version_no=p_version;
 if s is null or jsonb_typeof(s->'item') is distinct from 'object'
 or s#>>'{item,id}' is distinct from p_item::text
 or s#>>'{item,version_no}' is distinct from p_version::text
 or jsonb_typeof(s#>'{item,skill_id}') is distinct from 'string'
 or jsonb_typeof(s#>'{item,difficulty}') is distinct from 'number'
 or jsonb_typeof(s#>'{item,prompt_hy}') is distinct from 'string'
 or jsonb_typeof(s->'options') is distinct from 'array'
 or s#>'{answerKey,answer}' is null or s#>'{answerKey,answer}'='null'::jsonb
 then raise exception 'item_version_snapshot_required:%:%',p_item,p_version using errcode='23514';end if;
end;$$;

create or replace function private.capture_published_item_snapshot()
returns trigger language plpgsql security invoker set search_path='' as $$
declare k uuid; i public.items%rowtype; current_snapshot jsonb; old_snapshot jsonb;
begin
 if tg_table_name='items' then k:=coalesce(new.id,old.id);else k:=coalesce(new.item_id,old.item_id);end if;
 select * into i from public.items where id=k for update;
 if not found or i.status::text<>'published' then return null;end if;
 current_snapshot:=private.current_item_version_snapshot(k);
 select snapshot into old_snapshot from public.item_versions where item_id=k and version_no=i.version_no;
 if old_snapshot is null then
  -- Never convert an already-exposed version into invented historical evidence.
  if exists(select 1 from public.assessment_blueprint_items bi join public.assessment_blueprints b on b.id=bi.assessment_blueprint_id
    where bi.item_id=k and bi.item_version_snapshot=i.version_no and b.status<>'draft')
   or exists(select 1 from public.attempts a where a.item_id=k)
  then raise exception 'historical_item_snapshot_recovery_required:%:%',k,i.version_no using errcode='23514';end if;
  insert into public.item_versions(item_id,version_no,snapshot,change_summary)
  values(k,i.version_no,current_snapshot,'Atomic publication snapshot; not a historical recovery') on conflict(item_id,version_no) do nothing;
  select snapshot into old_snapshot from public.item_versions where item_id=k and version_no=i.version_no;
 end if;
 perform private.assert_item_version_snapshot(k,i.version_no);
 if private.item_snapshot_assessment_content(old_snapshot) is distinct from private.item_snapshot_assessment_content(current_snapshot)
 then raise exception 'published_item_snapshot_content_mismatch:%:%',k,i.version_no using errcode='23514';end if;
 return null;
end;$$;

create or replace function private.enforce_blueprint_item_snapshots()
returns trigger language plpgsql security invoker set search_path='' as $$
declare b record;r record;k uuid;
begin
 if tg_table_name='curriculum_releases' then
  if not exists(select 1 from public.curriculum_releases where id=new.id and status in('pilot','production')) then return null;end if;
  for r in select bi.item_id,bi.item_version_snapshot from public.assessment_blueprint_items bi join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id where bp.curriculum_release_id=new.id and bp.status in('pilot','production') loop
   perform private.assert_item_version_snapshot(r.item_id,r.item_version_snapshot);
  end loop;
 else
  if tg_table_name='assessment_blueprints' then k:=new.id;else k:=coalesce(new.assessment_blueprint_id,old.assessment_blueprint_id);end if;
  select * into b from public.assessment_blueprints where id=k;
  if not found or b.status not in('pilot','production') then return null;end if;
  for r in select item_id,item_version_snapshot from public.assessment_blueprint_items where assessment_blueprint_id=k loop
   perform private.assert_item_version_snapshot(r.item_id,r.item_version_snapshot);
  end loop;
 end if;
 return null;
end;$$;

create or replace function private.preserve_item_version_snapshot()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  if jsonb_typeof(new.snapshot->'item') is distinct from 'object'
    or new.snapshot#>>'{item,id}' is distinct from new.item_id::text
    or new.snapshot#>>'{item,version_no}' is distinct from new.version_no::text
  then raise exception 'item_version_snapshot_identity_mismatch' using errcode='23514';end if;
  return new;
 end if;
 if tg_op='UPDATE' and new is not distinct from old then return new;end if;
 raise exception 'item_version_snapshot_is_immutable' using errcode='23514';
end;$$;

drop trigger if exists item_version_snapshot_immutable on public.item_versions;
create trigger item_version_snapshot_immutable before insert or update or delete on public.item_versions for each row execute function private.preserve_item_version_snapshot();
drop trigger if exists published_item_snapshot on public.items;
create constraint trigger published_item_snapshot after insert or update on public.items deferrable initially deferred for each row execute function private.capture_published_item_snapshot();
drop trigger if exists published_option_snapshot on public.item_options;
create constraint trigger published_option_snapshot after insert or update or delete on public.item_options deferrable initially deferred for each row execute function private.capture_published_item_snapshot();
drop trigger if exists published_answer_snapshot on public.item_answer_keys;
create constraint trigger published_answer_snapshot after insert or update or delete on public.item_answer_keys deferrable initially deferred for each row execute function private.capture_published_item_snapshot();
drop trigger if exists blueprint_snapshot_integrity on public.assessment_blueprints;
create constraint trigger blueprint_snapshot_integrity after insert or update on public.assessment_blueprints deferrable initially deferred for each row execute function private.enforce_blueprint_item_snapshots();
drop trigger if exists blueprint_member_snapshot_integrity on public.assessment_blueprint_items;
create constraint trigger blueprint_member_snapshot_integrity after insert or update on public.assessment_blueprint_items deferrable initially deferred for each row execute function private.enforce_blueprint_item_snapshots();
drop trigger if exists release_snapshot_integrity on public.curriculum_releases;
create constraint trigger release_snapshot_integrity after insert or update on public.curriculum_releases deferrable initially deferred for each row execute function private.enforce_blueprint_item_snapshots();

revoke all on function private.current_item_version_snapshot(uuid),private.item_snapshot_assessment_content(jsonb),private.assert_item_version_snapshot(uuid,integer),private.capture_published_item_snapshot(),private.enforce_blueprint_item_snapshots(),private.preserve_item_version_snapshot() from public,anon,authenticated;
grant execute on function private.current_item_version_snapshot(uuid),private.item_snapshot_assessment_content(jsonb),private.assert_item_version_snapshot(uuid,integer),private.capture_published_item_snapshot(),private.enforce_blueprint_item_snapshots(),private.preserve_item_version_snapshot() to service_role;
