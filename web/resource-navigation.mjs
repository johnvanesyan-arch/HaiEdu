export const resourceHref=c=>'./materials.html'+(c?'?'+new URLSearchParams({enrollment:c.enrollmentId,release:c.curriculumReleaseId,unit:c.unitId}):'');
