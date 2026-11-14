"""Negative controls for the structural comparison, including deparser labels."""
import copy
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('baseline', ROOT / 'scripts/build-fresh-baseline.py')
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)


class CatalogueControls(unittest.TestCase):
    def test_unused_right_union_default_label_is_representation_only(self):
        a = "select null::uuid as id union all select null::uuid"
        c = "select null::uuid as id union all select null::uuid as uuid"
        self.assertEqual(b.canonical_view(a), b.canonical_view(c))

    def test_left_output_name_is_never_discarded(self):
        self.assertNotEqual(b.canonical_view("select null::uuid as id union all select null::uuid"),
                            b.canonical_view("select null::uuid as uuid union all select null::uuid"))

    def test_ordered_right_arm_keeps_its_label(self):
        self.assertNotEqual(b.canonical_view("select null::uuid as id union all (select null::uuid order by 1)"),
                            b.canonical_view("select null::uuid as id union all (select null::uuid as uuid order by 1)"))

    def test_changed_expression_and_filter_are_detected(self):
        original = "select 'a'::text as value union all select 'b'::text"
        for changed in ["select 'a'::text as value union all select 'c'::text as text",
                        "select 'a'::text as value union all select 'b'::text as text where false"]:
            self.assertNotEqual(b.canonical_view(original), b.canonical_view(changed))

    def test_column_order_is_preserved(self):
        a = {'columns':[{'name':'a','type':'text'},{'name':'b','type':'text'}]}
        c = copy.deepcopy(a);c['columns'].reverse()
        self.assertNotEqual(b.digest(a), b.digest(c))

    def test_enum_order_is_preserved(self):
        self.assertNotEqual(b.digest({'labels':['draft','active']}), b.digest({'labels':['active','draft']}))

    def test_privilege_order_is_ignored_but_grant_option_is_kept(self):
        a = {'acl':[{'grantee':'anon','privilege':'SELECT','grantable':False},
                    {'grantee':'service_role','privilege':'SELECT','grantable':False}]}
        c = copy.deepcopy(a);c['acl'].reverse()
        self.assertEqual(b.digest(a), b.digest(c))
        c['acl'][0]['grantable'] = True
        self.assertNotEqual(b.digest(a), b.digest(c))

    def test_access_control_changes_are_detected(self):
        a = {'rls':True,'forceRls':True,'options':['security_invoker=true'],
             'policies':[{'using':'(auth.uid() = user_id)'}]}
        for field,new in [('rls',False),('forceRls',False),('options',['security_invoker=false']),('policies',[{'using':'true'}])]:
            c = copy.deepcopy(a);c[field] = new
            self.assertNotEqual(b.digest(a), b.digest(c))


if __name__ == '__main__':
    unittest.main()
