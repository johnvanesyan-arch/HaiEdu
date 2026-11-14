-- READ ONLY. Application structure and permissions, never application rows.
-- Run with search_path=pg_catalog in a read-only transaction for canonical names.
WITH app_relations AS (
  SELECT c.*, n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','v','S')
), app_functions AS (
  SELECT p.*, n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('public','private')
)
SELECT jsonb_build_object(
  'schemas', (SELECT jsonb_agg(jsonb_build_object(
    'name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
    'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(a.grantor),
      'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type)
      FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a)
    ) ORDER BY n.nspname) FROM pg_namespace n WHERE n.nspname IN ('public','private')),
  'enums',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',t.typname,
    'owner',pg_get_userbyid(t.typowner),'labels',(SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid=t.oid),
    'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(a.grantor),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type) FROM aclexplode(coalesce(t.typacl,acldefault('T',t.typowner))) a)
    ) ORDER BY n.nspname,t.typname) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname IN ('public','private') AND t.typtype='e'),
  'relations',(SELECT jsonb_agg(jsonb_build_object(
    'schema',c.nspname,'name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
    'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'options',c.reloptions,
    'persistence',c.relpersistence,'replicaIdentity',c.relreplident,
    'comment',obj_description(c.oid,'pg_class'),
    'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(a.grantor),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type) FROM aclexplode(coalesce(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,c.relowner))) a),
    'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
      'notNull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,
      'default',pg_get_expr(d.adbin,d.adrelid),'collation',CASE WHEN a.attcollation<>t.typcollation THEN a.attcollation::regcollation::text END,
      'storage',a.attstorage,'compression',a.attcompression,'statistics',a.attstattarget,'options',a.attoptions,
      'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(ca.grantor),'grantee',CASE WHEN ca.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(ca.grantee) END,'privilege',ca.privilege_type,'grantable',ca.is_grantable) ORDER BY ca.grantee,ca.privilege_type) FROM aclexplode(a.attacl) ca),
      'comment',col_description(c.oid,a.attnum)) ORDER BY a.attnum)
      FROM pg_attribute a JOIN pg_type t ON t.oid=a.atttypid LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
    'constraints',(SELECT jsonb_agg(jsonb_build_object('name',k.conname,'type',k.contype,'definition',pg_get_constraintdef(k.oid,true),'validated',k.convalidated,'deferrable',k.condeferrable,'deferred',k.condeferred) ORDER BY k.conname) FROM pg_constraint k WHERE k.conrelid=c.oid),
    'indexes',(SELECT jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
      'constraint',(SELECT k.conname FROM pg_constraint k WHERE k.conindid=i.indexrelid AND k.conrelid=c.oid AND k.contype IN ('p','u','x')),
      'valid',i.indisvalid,'ready',i.indisready,'replicaIdentity',i.indisreplident,'clustered',i.indisclustered,
      'comment',obj_description(ic.oid,'pg_class')) ORDER BY ic.relname) FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid),
    'policies',(SELECT jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
      'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY x) FROM unnest(p.polroles) x),
      'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname)
      FROM pg_policy p WHERE p.polrelid=c.oid),
    'viewDefinition',CASE WHEN c.relkind='v' THEN pg_get_viewdef(c.oid,false) END,
    'viewDependencies',CASE WHEN c.relkind='v' THEN (SELECT jsonb_agg(DISTINCT format('%I.%I',dn.nspname,dc.relname))
      FROM pg_rewrite r JOIN pg_depend d ON d.classid='pg_rewrite'::regclass AND d.objid=r.oid AND d.refclassid='pg_class'::regclass
      JOIN pg_class dc ON dc.oid=d.refobjid JOIN pg_namespace dn ON dn.oid=dc.relnamespace
      WHERE r.ev_class=c.oid AND dc.oid<>c.oid AND dc.relkind='v' AND dn.nspname IN('public','private')) END,
    'sequence',CASE WHEN c.relkind='S' THEN (SELECT jsonb_build_object('type',format_type(s.seqtypid,NULL),'start',s.seqstart::text,'increment',s.seqincrement::text,'min',s.seqmin::text,'max',s.seqmax::text,'cache',s.seqcache::text,'cycle',s.seqcycle,
      'ownedBy',(SELECT format('%I.%I.%I',rn.nspname,rc.relname,a.attname) FROM pg_depend dep JOIN pg_class rc ON rc.oid=dep.refobjid JOIN pg_namespace rn ON rn.oid=rc.relnamespace JOIN pg_attribute a ON a.attrelid=rc.oid AND a.attnum=dep.refobjsubid WHERE dep.classid='pg_class'::regclass AND dep.objid=c.oid AND dep.refclassid='pg_class'::regclass AND dep.deptype IN('a','i')),
      'dependencyType',(SELECT dep.deptype FROM pg_depend dep WHERE dep.classid='pg_class'::regclass AND dep.objid=c.oid AND dep.refclassid='pg_class'::regclass AND dep.deptype IN('a','i')))
      FROM pg_sequence s WHERE s.seqrelid=c.oid) END
    ) ORDER BY c.nspname,c.relname) FROM app_relations c),
  'functions',(SELECT jsonb_agg(jsonb_build_object('schema',p.nspname,'name',p.proname,
    'arguments',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),
    'owner',pg_get_userbyid(p.proowner),'comment',obj_description(p.oid,'pg_proc'),
    'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(a.grantor),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)
    ) ORDER BY p.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) FROM app_functions p),
  'triggers',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',t.tgname,
    'definition',pg_get_triggerdef(t.oid,false),'enabled',t.tgenabled,'comment',obj_description(t.oid,'pg_trigger')) ORDER BY n.nspname,c.relname,t.tgname)
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE NOT t.tgisinternal AND (n.nspname IN('public','private') OR t.tgfoid IN(SELECT oid FROM app_functions))),
  'defaultPrivileges',(SELECT jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'schema',n.nspname,'type',d.defaclobjtype,
    'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(a.grantor),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type) FROM aclexplode(d.defaclacl) a)) ORDER BY pg_get_userbyid(d.defaclrole),n.nspname,d.defaclobjtype)
    FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname IN('public','private') OR d.defaclnamespace=0)
) AS catalogue;
