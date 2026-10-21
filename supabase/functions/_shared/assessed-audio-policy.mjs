// Versioned, subject-neutral contract. The adopting assessment supplies its count.
export function validAssessedAudioPolicy(value) {
 return value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).length===7
  && value.schemaVersion==='haiedu-assessed-audio-v1'
  && Number.isSafeInteger(value.maximumPlays) && value.maximumPlays>=1 && value.maximumPlays<=10
  && value.playbackRate===1 && value.transcriptAvailable===false
  && value.scope==='session-recording' && value.questionVisibility==='whole-recording'
  && value.interruption==='resume-or-unscored-v1';
}
