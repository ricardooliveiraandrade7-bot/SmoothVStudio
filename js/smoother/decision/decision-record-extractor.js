// ==========================================
// SMOOTHVSTUDIO
// DECISION RECORD EXTRACTOR
// V0.1
// ==========================================

class TreatmentDecisionRecordExtractor {
  
  
  // ======================================
  // EXTRAIR TIPO DE TRATAMENTO
  // ======================================
  
  static extractTreatmentType(
    record,
    helpers = {}
  ) {
    
    const isObject =
      typeof helpers.isObject ===
      "function" ?
      helpers.isObject :
      (
        input
      ) => {
        
        return !!(
          input &&
          typeof input ===
          "object"
        );
      };
    
    
    const safeString =
      typeof helpers.safeString ===
      "function" ?
      helpers.safeString :
      (
        input,
        fallback = ""
      ) => {
        
        if (
          typeof input !==
          "string"
        ) {
          
          return fallback;
        }
        
        return input.trim();
      };
    
    
    if (
      !isObject(
        record
      )
    ) {
      
      return "none";
    }
    
    
    const decision =
      isObject(
        record.decision
      ) ?
      record.decision :
      {};
    
    
    return safeString(
      record.treatmentType ||
      record.treatment ||
      record.actionType ||
      decision.treatmentType ||
      decision.treatment ||
      decision.type ||
      decision.actionType ||
      "none",
      "none"
    );
  }
}


// ==========================================
// EXPOSIÇÃO GLOBAL
// ==========================================

if (
  typeof window !==
  "undefined"
) {
  
  window.TreatmentDecisionRecordExtractor =
    TreatmentDecisionRecordExtractor;
}