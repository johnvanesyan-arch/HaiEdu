// Invoked only after verified identity, live Auth session and course access.
export function legacyAnswerRequest(body) {
  return {sessionId:body.sessionId,sessionItemId:body.sessionItemId,itemId:body.itemId,
    response:body.response,responseTimeMs:body.responseTimeMs??null,hintUsed:Boolean(body.hintUsed)};
}

export async function legacyAnswerReceipt(admin, studentId, authSessionId, kind, body, response=null, telemetry=null) {
  const {data,error}=await admin.rpc('service_legacy_answer_response',{
    p_student_id:studentId,p_auth_session_id:authSessionId,p_kind:kind,
    p_request:legacyAnswerRequest(body),p_response:response,p_telemetry:telemetry,
  });
  if(error) {
    const code=['answer_response_conflict','answer_result_unavailable','learning_context_unavailable']
      .find(value=>String(error.message??'').includes(value));
    return {error:code??'answer_response_unavailable',status:code==='learning_context_unavailable'?403:code?409:503};
  }
  return data;
}

export async function finishLegacyAnswer(admin, studentId, authSessionId, kind, body, response, telemetry=null) {
  const receipt=await legacyAnswerReceipt(admin,studentId,authSessionId,kind,body,response,telemetry);
  return receipt.error?receipt:{body:{...receipt.response,replayed:receipt.replayed===true},status:200};
}
