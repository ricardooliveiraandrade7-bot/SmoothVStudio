// ==========================================
// SMOOTHVSTUDIO
// DECISION CONFIDENCE
// V0.1
// ==========================================
//
// Responsabilidade:
//
// Extrair e normalizar a confiança de um
// Treatment Decision Record.
//
// Este módulo NÃO:
// - altera decisões;
// - executa DSP;
// - altera AudioBuffer;
// - cria tratamento;
// - concede autoridade.
//
// ==========================================


class TreatmentDecisionConfidence {
  
  
  // ======================================
  // EXTRAIR CONFIANÇA
  // ======================================
  
  static extractConfidence(
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
      
      return "indeterminate";
    }
    
    
    const decision =
      isObject(
        record.decision
      ) ?
      record.decision :
      {};
    
    
    const value =
      record.confidence ||
      record.decisionConfidence ||
      decision.confidence ||
      record.evidenceConfidence ||
      null;
    
    
    if (
      typeof value ===
      "number"
    ) {
      
      if (
        value >= 0.8
      ) {
        
        return "strong";
      }
      
      
      if (
        value >= 0.5
      ) {
        
        return "moderate";
      }
      
      
      if (
        value > 0
      ) {
        
        return "weak";
      }
      
      
      return "indeterminate";
    }
    
    
    const text =
      safeString(
        value,
        "indeterminate"
      )
      .toLowerCase();
    
    
    if (
      text === "strong" ||
      text === "forte"
    ) {
      
      return "strong";
    }
    
    
    if (
      text === "moderate" ||
      text === "moderada"
    ) {
      
      return "moderate";
    }
    
    
    if (
      text === "weak" ||
      text === "fraca"
    ) {
      
      return "weak";
    }
    
    
    return "indeterminate";
  }
}


// ==========================================
// EXPOSIÇÃO GLOBAL
// ==========================================

if (
  typeof window !==
  "undefined"
) {
  
  window.TreatmentDecisionConfidence =
    TreatmentDecisionConfidence;
}