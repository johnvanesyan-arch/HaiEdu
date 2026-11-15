// Role-neutral account rules and wording, shared by the account page (privacy.js, every role)
// and the teacher account view (teacher-account.mjs). No DOM, no network and no role decisions here.
import {erasurePresentation} from './task-privacy-view.mjs';

// One display-name rule for every role (owner decision, 14 November 2026). The server applies the same rule in
// supabase/functions/_shared/display-name.mjs; tests/display-name-rule.test.mjs keeps the two identical.
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 80;
export function normalizeDisplayName(value) {
  return String(value ?? "").trim().replace(/\s+/gu, " ");
}
export function displayNameError(value) {
  const length = [...normalizeDisplayName(value)].length;
  if (length === 0) return "display_name_required";
  if (length < DISPLAY_NAME_MIN) return "display_name_too_short";
  if (length > DISPLAY_NAME_MAX) return "display_name_too_long";
  return null;
}
// Existing product wording (teacher page), now shared by every role.
const DISPLAY_NAME_MESSAGES = {
  display_name_required: "Մուտքագրեք ձեր անունն ու ազգանունը։",
  display_name_too_short: "Անունը պետք է պարունակի առնվազն 2 նիշ։",
  display_name_too_long: "Անունը չափազանց երկար է։",
};
// Armenian text for a name error code from displayNameError or from the server; null for any other code.
export function displayNameMessage(code) {
  return DISPLAY_NAME_MESSAGES[code] ?? null;
}

// Why a deletion request was rejected. Three reasons have fixed wording; "other" shows what the administrator
// wrote for that request. An unknown code, or "other" with nothing written, has no reason line.
const REJECTION_REASONS = {
  staff_offboarding_required: "նախ պետք է փոխանցվեն ձեր դասարաններն ու գործերը։",
  not_verified: "հարցումը չհաջողվեց հաստատել։",
  duplicate_request: "նույն հարցումն արդեն ուղարկված է։",
};
export function rejectionReason(request) {
  if (request?.status !== "rejected") return "";
  const written = request.resolution_code === "other" ? String(request.resolution_note ?? "").trim() : "";
  const reason = REJECTION_REASONS[request.resolution_code] ?? written;
  return reason ? `Պատճառը՝ ${reason}` : "";
}

export function roleLabel(role) {
  return ({ student: "Աշակերտ", teacher: "Ուսուցիչ", school_admin: "Դպրոցի ադմին", content_admin: "Բովանդակության ստուգող", admin: "Master admin", parent: "Ծնող" })[role] || role;
}

export function statusLabel(status) {
  return ({ active: "Ակտիվ", suspended: "Կասեցված", deletion_pending: "Ջնջման հաստատման փուլում" })[status] || status;
}

export function inventoryPresentation(role, inventory) {
  const minimization = "Ծննդյան ամսաթիվ, տան հասցե, հեռախոսահամար, ծնողի էլ. հասցե և պետական նույնականացուցիչ այս պրոֆիլում չենք պահում։ Հաշվի էլ. հասցեն պահվում է Supabase Auth-ում։";
  const views = {
    student: {
      title: "Ինչ տվյալներ ենք պահում աշակերտի մասին",
      description: "Աշակերտի պրոֆիլում պահվում են հաշվի տվյալները և ուսուցման համար անհրաժեշտ դասարանային, հրավերների ու առաջընթացի գրառումները։",
      rows: [
        ["Դասարաններ", inventory.classMemberships ?? 0],
        ["Ստացված հրավերների գրառումներ", inventory.invitationsReceived ?? 0],
        ["Ուսուցչից ստացված նյութային առաջադրանքներ", inventory.materialAssignmentsReceived ?? 0],
        ["Ուսուցչից ստացված գրավոր առաջադրանքներ", inventory.writingAssignmentsReceived ?? 0],
        ["Պատասխանների փորձեր", inventory.attempts ?? 0],
        ["Ուսուցման սեսիաներ", inventory.learningSessions ?? 0],
        ["Հմտությունների առաջընթացի գրառումներ", inventory.masteryRows ?? 0],
        ["Ամրապնդման գրառումներ", inventory.remediationEvents ?? 0],
        ["Գրավոր աշխատանքներ՝ սևագրեր, պատասխաններ, ստուգումներ", inventory.writtenWork ?? 0],
        ["Չուղարկված պատասխանների սևագրեր", inventory.responseDrafts ?? 0],
        ["Ձայնանյութերի օգտագործման գրառումներ", inventory.audioDeliveries ?? 0],
        ["Գնահատման ընթացքում ձայնանյութերի օգտագործման գրառումներ", inventory.assessedAudioRecordings ?? 0],
        ["Ընդհանուր նյութերի դիտման գրառումներ", inventory.sourceFamilyExposures ?? 0],
      ],
    },
    teacher: {
      title: "Ինչ տվյալներ ենք պահում ուսուցչի մասին",
      description: "Ուսուցչի պրոֆիլում պահվում են հաշվի տվյալները, դպրոցի անդամակցության պատմությունը, դասավանդման նշանակումները, ստեղծված հրավերներն ու կոդերը և գործողությունների աուդիտը։ Աշակերտների արդյունքները այստեղ չեն ներկայացվում։",
      rows: [
        ["Դպրոցի անդամակցության գրառումներ", inventory.institutionalMemberships ?? 0],
        ["Դասավանդման նշանակումներ", inventory.teachingAssignments ?? 0],
        ["Ուղարկված նյութային առաջադրանքներ", inventory.materialAssignmentsSent ?? 0],
        ["Ուղարկված գրավոր առաջադրանքներ", inventory.writingAssignmentsSent ?? 0],
        ["Գրավոր աշխատանքների գնահատումներ ու նշումներ", inventory.writtenReviews ?? 0],
        ["Գնահատման անձնական սևագրեր", inventory.feedbackDrafts ?? 0],
        ["Պատրաստի անձնական գրառումներ՝ ներառյալ արխիվը", inventory.feedbackSnippets ?? 0],
        ["Գնահատման ուղարկման հաստատումներ", inventory.feedbackReceipts ?? 0],
        ["Ստեղծված հրավերներ և կոդեր", inventory.invitationRecords ?? 0],
        ["Աուդիտային գործողություններ", inventory.auditEvents ?? 0],
      ],
    },
    school_admin: {
      title: "Ինչ տվյալներ ենք պահում դպրոցի ադմինի մասին",
      description: "Դպրոցի ադմինի պրոֆիլում պահվում են հաշվի տվյալները, դպրոցի անդամակցության պատմությունը, ուղարկված հրավերները և վարչական գործողությունների աուդիտը։",
      rows: [
        ["Դպրոցի անդամակցության գրառումներ", inventory.institutionalMemberships ?? 0],
        ["Ուղարկված հրավերներ", inventory.invitationRecords ?? 0],
        ["Աուդիտային գործողություններ", inventory.auditEvents ?? 0],
      ],
    },
    content_admin: {
      title: "Ինչ տվյալներ ենք պահում բովանդակության ստուգողի մասին",
      description: "Բովանդակության ստուգողի պրոֆիլում պահվում են հաշվի տվյալները, կատարված ստուգումների և գործողությունների աուդիտային գրառումները։",
      rows: [
        ["Բովանդակության ստուգումներ", inventory.contentReviews ?? 0],
        ["Գրավորի ստուգումներ", inventory.writtenTaskReviews ?? 0],
        ["Ուսումնական նյութերի տարբերակներ", inventory.materialVersions ?? 0],
        ["Ուսումնական նյութերի հաստատումներ", inventory.materialReviews ?? 0],
        ["Նյութերի ստուգման գործողություններ", inventory.materialEvents ?? 0],
        ["Աուդիտային գործողություններ", inventory.auditEvents ?? 0],
      ],
    },
    admin: {
      title: "Ինչ տվյալներ ենք պահում Master admin-ի մասին",
      description: "Master admin-ի պրոֆիլում պահվում են հաշվի տվյալները և անվտանգության ու վարչական գործողությունների աուդիտային գրառումները։",
      rows: [["Գրավորի ստուգումներ", inventory.writtenTaskReviews ?? 0],
        ["Ուսումնական նյութերի տարբերակներ", inventory.materialVersions ?? 0],
        ["Ուսումնական նյութերի հաստատումներ", inventory.materialReviews ?? 0],
        ["Նյութերի ստուգման գործողություններ", inventory.materialEvents ?? 0], ["Աուդիտային գործողություններ", inventory.auditEvents ?? 0]],
    },
  };
  return views[role] || {
    title: "Ինչ տվյալներ ենք պահում հաշվի մասին",
    description: "Պահվում են հաշվի հիմնական տվյալները և անվտանգության համար անհրաժեշտ աուդիտային գրառումները։",
    rows: [["Աուդիտային գործողություններ", inventory.auditEvents ?? 0]],
    minimization,
  };
}

export function deletionLabel(request) {
  if (!request) return "Ակտիվ ջնջման հարցում չկա։";
  if(request.status==="processing"&&erasurePresentation(request).started)return erasurePresentation(request).progress;
  const labels = {
    pending: "Հարցումն ուղարկված է և սպասում է ադմինի ստուգմանը։ Մինչև վերջնական ջնջումը կարող եք չեղարկել այն։",
    processing: "Ադմինը հաստատել է հարցումը, բայց վերջնական ջնջումը դեռ չի իրականացվել։ Դուք դեռ կարող եք չեղարկել այն։",
    completed: "Վերջին ջնջման հարցումն ավարտվել է։",
    rejected: "Վերջին ջնջման հարցումը մերժվել է։",
    cancelled: "Վերջին ջնջման հարցումը չեղարկվել է։",
  };
  return labels[request.status] || request.status;
}
